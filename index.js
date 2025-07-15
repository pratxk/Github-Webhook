import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(
  express.json({
    verirfy: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

const PORT = process.env.PORT || 3000;
const GITHUB_SECRET = process.env.GITHUB_SECRET;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

app.post("/webhook", (req, res) => {
  const signature = req.headers["x-hub-signature-256"];
  const hmac = crypto.createHmac("sha256", GITHUB_SECRET);
  const digest = "sha256=" + hmac.update(req.rawBody).digest("hex");
  if (signature !== digest) {
    return res.status(401).send("Signature mismatch");
  }
  const event = req.headers["x-github-event"];
  const payload = req.body;

  if (event === "issues" && payload.action === "opened") {
    const issue = payload.issue;
    const issueTitle = issue.title;
    const issueUrl = issue.html_url;
    const repoName = payload.repository.full_name;

    console.log(`🆕 New issue: ${issueTitle} at ${issueUrl}`);
    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: process.env.MY_EMAIL, // Your email (where you want to receive the notification)
      subject: `🛠️ New Issue in ${repoName}: ${issueTitle}`,
      text: `A new issue was opened: ${issueTitle}\n\nView it here: ${issueUrl}`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('❌ Error sending email:', err);
      } else {
        console.log('📬 Email sent:', info.response);
      }
    });
  }
    res.status(200).send("Webhook received");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
