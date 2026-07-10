/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Raw Slack message accepted at the callback API boundary.
 * Trusted external contract — not runtime-validated.
 */
export interface SlackConversationSourceInputMessage {
  /** Id of the channel the message was posted in. */
  channel: string;
  /** The message text, in Slack mrkdwn. */
  text: string;
  /** Timestamp of the message, used by Slack as the message id. */
  ts: string;
  /** Timestamp of the parent message when this message is a thread reply. */
  thread_ts?: string;
  /** Id of the user who posted the message. */
  user?: string;
}

/** Slack chat.postMessage payload sent to the relay after routing fields are added. */
export interface SlackConversationSourceOutputMessage {
  /** Id of the channel where the reply should be posted. */
  channel: string;
  /** Timestamp of the thread where the reply should be posted. */
  thread_ts: string;
  /** Message text, in Slack mrkdwn. */
  text: string;
}
