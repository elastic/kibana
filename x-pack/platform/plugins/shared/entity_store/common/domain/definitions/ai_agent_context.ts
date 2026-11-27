/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Facts about the entities related to an `ai_agent`, copied onto the agent's own row by the AI
 * agent context maintainer so single-row features (store-query watchlists, KQL) can use them.
 * Prototype names: every name lives in this file so they can be renamed in one place.
 *
 * `null` clears a value on write: the field is then absent from the row.
 */
export interface AiAgentContext {
  /** Watchlist IDs on every person the agent acts for, across each person's resolution group. */
  person_watchlists: string[] | null;
  /** Highest `asset.criticality` across those person rows. */
  person_criticality: string | null;
  /** False if any person row has MFA off, true if every known value is on, absent if unknown. */
  person_mfa_enabled: boolean | null;
  /** Highest `asset.criticality` of the hosts the agent depends on. */
  host_criticality: string | null;
  /** Other `ai_agent` rows that act for the same account. */
  shared_account_installs: number | null;
  computed_at: string;
}

export const AI_AGENT_CONTEXT_FIELD = 'entity.attributes.ai_agent_context';

export const AI_AGENT_CONTEXT_FIELD_TYPES = {
  person_watchlists: 'keyword',
  person_criticality: 'keyword',
  person_mfa_enabled: 'boolean',
  host_criticality: 'keyword',
  shared_account_installs: 'long',
  computed_at: 'date',
} as const satisfies Record<keyof AiAgentContext, 'keyword' | 'boolean' | 'long' | 'date'>;

export const getAiAgentContextFieldPath = (key: keyof AiAgentContext): string =>
  `${AI_AGENT_CONTEXT_FIELD}.${key}`;
