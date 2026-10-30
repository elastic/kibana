/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PerRuleState } from './types';

/** Wait before retrying a rule after its first failure; doubles with each failure in a row. */
export const RULE_BACKOFF_BASE_MS = 5 * 60_000;

/** Longest wait between retries, so a failing rule still tries a few times a day. */
export const RULE_BACKOFF_MAX_MS = 6 * 60 * 60_000;

export const MAX_LAST_ERROR_LENGTH = 500;

export const truncateRuleError = (message: string): string =>
  message.length > MAX_LAST_ERROR_LENGTH ? `${message.slice(0, MAX_LAST_ERROR_LENGTH)}…` : message;

export const getConsecutiveFailures = (state: PerRuleState | undefined): number =>
  typeof state?.consecutiveFailures === 'number' ? state.consecutiveFailures : 0;

export const getRuleBackoffDelayMs = (consecutiveFailures: number): number =>
  Math.min(RULE_BACKOFF_BASE_MS * 2 ** Math.max(consecutiveFailures - 1, 0), RULE_BACKOFF_MAX_MS);

/** The failure-streak fields of a rule state, to carry into a narrowed copy of it. */
export const pickRuleFailure = (state: PerRuleState): Partial<PerRuleState> => ({
  ...(typeof state.consecutiveFailures === 'number' && {
    consecutiveFailures: state.consecutiveFailures,
  }),
  ...(typeof state.nextAttemptAt === 'string' && { nextAttemptAt: state.nextAttemptAt }),
  ...(typeof state.lastFailedAt === 'string' && { lastFailedAt: state.lastFailedAt }),
});

/** The time a backing-off rule may run again, or `undefined` when it may run now. */
export const getBackoffUntil = (
  state: PerRuleState | undefined,
  now: number
): string | undefined => {
  const nextAttemptAt = state?.nextAttemptAt;
  return typeof nextAttemptAt === 'string' && Date.parse(nextAttemptAt) > now
    ? nextAttemptAt
    : undefined;
};

/**
 * Records a failed run so it is visible in the maintainer state and the rule waits
 * before retrying. A deterministic failure, such as a query too large for the
 * circuit breaker, would otherwise repeat on every tick.
 */
export const withRuleFailure = (
  state: PerRuleState,
  errorMessage: string,
  now: number
): PerRuleState => {
  const consecutiveFailures = getConsecutiveFailures(state) + 1;
  return {
    ...state,
    lastError: truncateRuleError(errorMessage),
    lastFailedAt: new Date(now).toISOString(),
    consecutiveFailures,
    nextAttemptAt: new Date(now + getRuleBackoffDelayMs(consecutiveFailures)).toISOString(),
  };
};
