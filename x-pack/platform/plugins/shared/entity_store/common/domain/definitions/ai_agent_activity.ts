/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * How an `ai_agent` ran over the last 30 days, from the agent's own Defend process events, written
 * onto its row by the AI agent activity maintainer. A session is one launch of the agent, the unit
 * the agent flyout counts. Prototype names: every name lives in this file so they can be renamed
 * in one place.
 */
export interface AiAgentActivity {
  /** Launches in the last 30 days. 0 means installed but idle. */
  sessions: number;
  /** UTC days with at least one session start. */
  active_days: number;
  /** Sessions launched by a schedule or a script (launch mode `scheduled` or `scripted`). */
  unattended_sessions: number;
  /** Sessions launched with permission prompts turned off. */
  permission_bypass_sessions: number;
  computed_at: string;
}

export const AI_AGENT_ACTIVITY_FIELD = 'entity.attributes.ai_agent_activity';

export const AI_AGENT_ACTIVITY_FIELD_TYPES = {
  sessions: 'long',
  active_days: 'long',
  unattended_sessions: 'long',
  permission_bypass_sessions: 'long',
  computed_at: 'date',
} as const satisfies Record<keyof AiAgentActivity, 'long' | 'date'>;

export const getAiAgentActivityFieldPath = (key: keyof AiAgentActivity): string =>
  `${AI_AGENT_ACTIVITY_FIELD}.${key}`;
