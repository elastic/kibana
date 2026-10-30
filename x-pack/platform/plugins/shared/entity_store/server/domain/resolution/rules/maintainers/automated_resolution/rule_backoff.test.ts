/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getBackoffUntil,
  getConsecutiveFailures,
  getRuleBackoffDelayMs,
  MAX_LAST_ERROR_LENGTH,
  withRuleFailure,
} from './rule_backoff';
import { EMPTY_RULE_STATE } from './types';

const MINUTE = 60_000;
const NOW = Date.parse('2026-10-29T12:00:00Z');

describe('rule backoff', () => {
  it('doubles from 5 minutes per failure in a row and caps at 6 hours', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 20].map((n) => getRuleBackoffDelayMs(n) / MINUTE)).toEqual([
      5, 10, 20, 40, 80, 160, 320, 360, 360,
    ]);
  });

  it('records the failure, counts it and schedules the next attempt', () => {
    const failed = withRuleFailure(
      { ...EMPTY_RULE_STATE, lastProcessedTimestamp: '2026-10-01T00:00:00Z' },
      'circuit_breaking_exception',
      NOW
    );

    expect(failed).toEqual({
      lastProcessedTimestamp: '2026-10-01T00:00:00Z',
      lastRun: null,
      lastError: 'circuit_breaking_exception',
      lastFailedAt: '2026-10-29T12:00:00.000Z',
      consecutiveFailures: 1,
      nextAttemptAt: '2026-10-29T12:05:00.000Z',
    });
    expect(getConsecutiveFailures(withRuleFailure(failed, 'again', NOW))).toBe(2);
  });

  it('truncates long errors', () => {
    const failed = withRuleFailure(EMPTY_RULE_STATE, 'x'.repeat(2000), NOW);
    expect((failed.lastError as string).length).toBe(MAX_LAST_ERROR_LENGTH + 1);
  });

  it('reports the next attempt only while it is in the future', () => {
    const failed = withRuleFailure(EMPTY_RULE_STATE, 'boom', NOW);

    expect(getBackoffUntil(failed, NOW)).toBe('2026-10-29T12:05:00.000Z');
    expect(getBackoffUntil(failed, NOW + 5 * MINUTE)).toBeUndefined();
    expect(getBackoffUntil(EMPTY_RULE_STATE, NOW)).toBeUndefined();
    expect(getBackoffUntil(undefined, NOW)).toBeUndefined();
  });
});
