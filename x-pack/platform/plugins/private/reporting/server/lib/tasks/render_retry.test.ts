/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueueTimeoutError,
  RenderCapacityTimeoutError,
  RenderFailedError,
  RenderRequestRejectedError,
  RenderRetryAction,
  RenderRetryReason,
  RenderServiceSaturatedError,
  RenderServiceUnavailableError,
} from '@kbn/reporting-common';
import {
  attemptsMade,
  decideRenderRetry,
  isNewAttempt,
  MAX_UNAVAILABLE_RUNS,
  RESCHEDULE_DELAY_MS,
} from './render_retry';

const NOW = Date.parse('2026-10-14T12:00:00Z');
const noJitter = () => 0.5;
const decide = (error: unknown, state = {}, attempts = 1) =>
  decideRenderRetry(error, state, { attempts, maxAttempts: 3 }, NOW, noJitter);

describe('decideRenderRetry', () => {
  it('leaves errors that did not come from page-render-service to the usual handling', () => {
    expect(decide(new Error('boom'))).toBeUndefined();
    expect(decide(new QueueTimeoutError())).toBeUndefined();
  });

  it('hands a report waiting for capacity straight back, as queuing', () => {
    expect(decide(new RenderServiceSaturatedError(), { unavailableRuns: 1 })).toEqual({
      action: RenderRetryAction.HAND_BACK,
      reason: RenderRetryReason.SATURATED,
      runAt: new Date(NOW),
      state: { unavailableRuns: 1, queued: true },
    });
  });

  it('reschedules an unreachable service as queuing, until it has used its runs', () => {
    let state = {};
    for (let run = 1; run < MAX_UNAVAILABLE_RUNS; run++) {
      const decision = decide(new RenderServiceUnavailableError(), state);
      expect(decision).toEqual({
        action: RenderRetryAction.RESCHEDULE,
        reason: RenderRetryReason.UNAVAILABLE,
        runAt: new Date(NOW + RESCHEDULE_DELAY_MS),
        state: { unavailableRuns: run, queued: true },
      });
      state = (decision as { state: object }).state;
    }

    expect(decide(new RenderServiceUnavailableError(), state)).toEqual({
      action: RenderRetryAction.FAIL,
      reason: RenderRetryReason.UNAVAILABLE,
    });
  });

  it('reschedules a failed render as another attempt, whose wait for a slot starts then', () => {
    expect(decide(new RenderFailedError(), { unavailableRuns: 2, queued: true }, 2)).toEqual({
      action: RenderRetryAction.RESCHEDULE,
      reason: RenderRetryReason.RENDER_FAILURE,
      runAt: new Date(NOW + RESCHEDULE_DELAY_MS),
      state: { unavailableRuns: 2, queued: false, waitingSince: NOW + RESCHEDULE_DELAY_MS },
    });
  });

  it('keeps the start of the wait across queuing runs', () => {
    const state = { waitingSince: NOW - 30_000 };

    expect(decide(new RenderServiceSaturatedError(), state)).toMatchObject({ state });
    expect(decide(new RenderServiceUnavailableError(), state)).toMatchObject({ state });
  });

  it('fails a failed render once the report has used its attempts', () => {
    expect(decide(new RenderFailedError(), {}, 3)).toEqual({
      action: RenderRetryAction.FAIL,
      reason: RenderRetryReason.RENDER_FAILURE,
    });
  });

  it('fails a request the service rejected, without retrying', () => {
    expect(decide(new RenderRequestRejectedError())).toEqual({
      action: RenderRetryAction.FAIL,
      reason: RenderRetryReason.REJECTED,
    });
  });

  it('fails a report that waited out the capacity ceiling', () => {
    expect(decide(new RenderCapacityTimeoutError())).toEqual({
      action: RenderRetryAction.FAIL,
      reason: RenderRetryReason.SATURATED,
    });
  });

  it('spreads reschedules across ±50% of the delay', () => {
    const at = (random: number) =>
      (
        decideRenderRetry(
          new RenderFailedError(),
          {},
          { attempts: 1, maxAttempts: 3 },
          NOW,
          () => random
        ) as { runAt: Date }
      ).runAt.getTime() - NOW;

    expect(at(0)).toBe(RESCHEDULE_DELAY_MS / 2);
    expect(at(0.999)).toBeLessThan(RESCHEDULE_DELAY_MS * 1.5);
  });
});

describe('isNewAttempt', () => {
  it('counts a run with no render retries behind it', () => {
    expect(isNewAttempt(undefined, 1)).toBe(true);
    expect(isNewAttempt({}, 2)).toBe(true);
  });

  it('does not count the run after queuing', () => {
    expect(isNewAttempt({ queued: true }, 1)).toBe(false);
  });

  it('counts the run after a failed render', () => {
    expect(isNewAttempt({ queued: false }, 1)).toBe(true);
  });

  it('counts a retry after the run that followed queuing failed', () => {
    // A thrown failure keeps the task state, but Task Manager counts the attempt.
    expect(isNewAttempt({ queued: true }, 2)).toBe(true);
  });
});

describe('attemptsMade', () => {
  it("uses Task Manager's count when nothing was rescheduled", () => {
    expect(attemptsMade(undefined, 2, 5)).toBe(2);
  });

  it("uses the report's count once a reschedule has restarted Task Manager's", () => {
    expect(attemptsMade({ queued: false }, 1, 2)).toBe(2);
    expect(attemptsMade({ queued: true }, 2, 1)).toBe(2);
  });
});
