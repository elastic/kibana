/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { __testing__ } from './runner';

const { decideNextState, MAX_CONSECUTIVE_FAILURES } = __testing__;

const baseStats = {
  cases_indexed: 10,
  activity_indexed: 20,
  lifecycle_indexed: 10,
  cases_failed: 0,
  activity_failed: 0,
  lifecycle_failed: 0,
  duration_ms: 1234,
};

const proposedWatermark = '2026-05-08T10:00:00.000Z';
const currentWatermark = '2026-05-08T09:30:00.000Z';

describe('reconciliation watermark policy', () => {
  let log: ReturnType<typeof loggingSystemMock.create>['get'];

  beforeEach(() => {
    log = loggingSystemMock.create().get();
  });

  describe('happy path (no failures)', () => {
    it('advances the watermark and resets the failure counter', () => {
      const next = decideNextState({
        log,
        previousFailureCount: 0,
        tickFailedSomewhere: false,
        currentWatermark,
        proposedWatermark,
        stats: baseStats,
        duration_ms: baseStats.duration_ms,
      });

      expect(next.last_run_at).toBe(proposedWatermark);
      expect(next.consecutive_failure_count).toBe(0);
    });

    it('also resets a non-zero counter on a fully-successful tick', () => {
      const next = decideNextState({
        log,
        previousFailureCount: 3,
        tickFailedSomewhere: false,
        currentWatermark,
        proposedWatermark,
        stats: baseStats,
        duration_ms: baseStats.duration_ms,
      });

      expect(next.last_run_at).toBe(proposedWatermark);
      expect(next.consecutive_failure_count).toBe(0);
    });
  });

  describe('failures within the retry window', () => {
    it('keeps the watermark and bumps the counter from 0 → 1', () => {
      const next = decideNextState({
        log,
        previousFailureCount: 0,
        tickFailedSomewhere: true,
        currentWatermark,
        proposedWatermark,
        stats: { ...baseStats, cases_failed: 2 },
        duration_ms: baseStats.duration_ms,
      });

      expect(next.last_run_at).toBe(currentWatermark);
      expect(next.consecutive_failure_count).toBe(1);
      expect(log.warn).toHaveBeenCalled();
      expect(log.error).not.toHaveBeenCalled();
    });

    it('keeps holding while consecutive failures < MAX_CONSECUTIVE_FAILURES', () => {
      const next = decideNextState({
        log,
        previousFailureCount: MAX_CONSECUTIVE_FAILURES - 2,
        tickFailedSomewhere: true,
        currentWatermark,
        proposedWatermark,
        stats: { ...baseStats, lifecycle_failed: 1 },
        duration_ms: baseStats.duration_ms,
      });

      expect(next.last_run_at).toBe(currentWatermark);
      expect(next.consecutive_failure_count).toBe(MAX_CONSECUTIVE_FAILURES - 1);
      expect(log.warn).toHaveBeenCalled();
      expect(log.error).not.toHaveBeenCalled();
    });
  });

  describe('circuit breaker', () => {
    it('trips when previous failures = MAX - 1 and this tick also fails', () => {
      // After MAX_CONSECUTIVE_FAILURES - 1 + 1 = MAX_CONSECUTIVE_FAILURES total
      // failing ticks, the breaker should trip.
      const next = decideNextState({
        log,
        previousFailureCount: MAX_CONSECUTIVE_FAILURES - 1,
        tickFailedSomewhere: true,
        currentWatermark,
        proposedWatermark,
        stats: { ...baseStats, activity_failed: 1 },
        duration_ms: baseStats.duration_ms,
      });

      expect(next.last_run_at).toBe(proposedWatermark); // ← advanced anyway
      expect(next.consecutive_failure_count).toBe(0); // ← reset
      expect(log.error).toHaveBeenCalled();
    });

    it('also trips when previous failures already exceed MAX (sanity)', () => {
      const next = decideNextState({
        log,
        previousFailureCount: MAX_CONSECUTIVE_FAILURES + 5,
        tickFailedSomewhere: true,
        currentWatermark,
        proposedWatermark,
        stats: baseStats,
        duration_ms: baseStats.duration_ms,
      });

      expect(next.last_run_at).toBe(proposedWatermark);
      expect(next.consecutive_failure_count).toBe(0);
      expect(log.error).toHaveBeenCalled();
    });
  });
});
