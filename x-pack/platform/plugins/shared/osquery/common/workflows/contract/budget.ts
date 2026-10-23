/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_WAIT_MS = 5 * 60 * 1000;
export const MAX_WAIT_MS = 30 * 60 * 1000;

const WAIT_UNIT_MS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000 } as const;

/** False for a duration above {@link MAX_WAIT_MS}. Invalid strings are rejected by the schema regex. */
export const isWithinMaxWait = (value: string): boolean => {
  const match = value.match(/^([1-9][0-9]*)(s|m|h)$/);
  if (!match) return false;

  const unit = match[2] as keyof typeof WAIT_UNIT_MS;

  return Number(match[1]) * WAIT_UNIT_MS[unit] <= MAX_WAIT_MS;
};

export const DEFAULT_MAX_ROWS = 1000;
export const MAX_ROWS = 10000;

export const MAX_AGENT_IDS = 250;
export const MAX_AGENT_POLICY_IDS = 10;
/** Post-expansion ceiling: the live-query route has no bound of its own. */
export const TARGET_AGENT_LIMIT = 1000;

/** The results route answers 400 `PAGINATION_LIMIT_EXCEEDED` at `page * pageSize >= 10000`. */
export const RESULTS_PAGE_SIZE = 200;
export const RESULTS_MAX_WINDOW = 10000;
/** `callKibanaApi` caps one response at 10MB and the step output must stay below it. */
export const OUTPUT_BUDGET_BYTES = 8 * 1024 * 1024;

export const POLL_POLICY = {
  strategy: 'exponential',
  initialMs: 5000,
  maxMs: 30000,
  jitter: true,
} as const;

/**
 * Both fields must always be set: `createPollServerStepDefinition` falls back to its defaults
 * for the whole object when either one is omitted.
 */
export const POLL_CEILINGS = { maxAttempts: 150, maxWaitMs: 30000 } as const;
