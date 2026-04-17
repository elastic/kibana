/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Saved Object type for tracking Slack session state per conversation.
 *
 * Stored separately from the conversation document so that agentBuilder's
 * full document replace cannot overwrite Slack routing metadata.
 *
 * SO ID: `conv:<conversationId>` — allows O(1) lookup by conversation ID.
 * Searchable by `origin_ref` attribute to find the conversation for a Slack thread.
 */

export const SLACK_SESSION_SO_TYPE = 'elastic-console-slack-session';

export const SLACK_SESSION_SO_ID_PREFIX = 'conv:';

export const slackSessionSoId = (conversationId: string): string =>
  `${SLACK_SESSION_SO_ID_PREFIX}${conversationId}`;

export const conversationIdFromSoId = (soId: string): string =>
  soId.startsWith(SLACK_SESSION_SO_ID_PREFIX)
    ? soId.slice(SLACK_SESSION_SO_ID_PREFIX.length)
    : soId;

export interface SlackSessionAttributes {
  /** Slack thread identifier, e.g. "slack:C0AMREPCC0J:1773986596.210179" */
  origin_ref: string;
  /** Current surface location (slack thread, cli, mcp, etc.) */
  location: string | null;
  /** Original Slack thread location (preserved after fork/locate) */
  origin_location: string | null;
  /** Connector used in this conversation */
  connector_id: string | null;
  /** Context from parent conversation carried into a fork */
  fork_context: string | null;
  /** Summary posted back to Slack on handoff */
  handoff_summary: string | null;
  /** ISO timestamp of last location update */
  located_at: string | null;
  updated_at: string;
}
