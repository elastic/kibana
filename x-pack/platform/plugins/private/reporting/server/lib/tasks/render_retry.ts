/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RenderCapacityTimeoutError,
  RenderRetryAction,
  RenderRetryReason,
  RenderServiceError,
  RenderServiceRetryClass,
} from '@kbn/reporting-common';

/**
 * The between-runs half of the page-render-service retry ladder; `retry_ladder.ts` in the
 * page-render-screenshotting plugin is the in-run half.
 *
 * Reschedules return `{ runAt, state }` as a successful run, because a thrown error spends a task
 * attempt. Waiting on capacity or an unreachable service is queuing; a failed render is an attempt.
 */

/** Runs allowed while the service cannot be reached, counting the first. */
export const MAX_UNAVAILABLE_RUNS = 4;
/** Before rerunning after an `unavailable` or `render_failure` error. */
export const RESCHEDULE_DELAY_MS = 10_000;

export interface RenderRetryState {
  unavailableRuns?: number;
  /** Set on every reschedule; true when the last run was queuing, so the next is no new attempt. */
  queued?: boolean;
  /** Epoch ms when the wait for a render slot restarted after a failed render. */
  waitingSince?: number;
}

export type RenderRetryDecision =
  | {
      action: RenderRetryAction.HAND_BACK | RenderRetryAction.RESCHEDULE;
      reason: RenderRetryReason;
      runAt: Date;
      // Task Manager stores state as a plain record.
      state: RenderRetryState & Record<string, unknown>;
    }
  | { action: RenderRetryAction.FAIL; reason: RenderRetryReason };

/** Undefined for errors not from page-render-service, which keep reporting's usual handling. */
export function decideRenderRetry(
  error: unknown,
  state: RenderRetryState | undefined,
  { attempts, maxAttempts }: { attempts: number; maxAttempts: number },
  now: number = Date.now(),
  random: () => number = Math.random
): RenderRetryDecision | undefined {
  if (!(error instanceof RenderServiceError)) {
    return undefined;
  }

  // ±50%, so reports that failed together do not return together.
  const later = () => new Date(now + Math.round(RESCHEDULE_DELAY_MS * (0.5 + random())));
  const { unavailableRuns = 0, waitingSince } = state ?? {};
  const waiting = waitingSince === undefined ? {} : { waitingSince };
  switch (error.retryClass) {
    case RenderServiceRetryClass.CAPACITY:
      // Task Manager picks it straight back up, and the next run waits again.
      return {
        action: RenderRetryAction.HAND_BACK,
        reason: RenderRetryReason.SATURATED,
        runAt: new Date(now),
        state: { unavailableRuns, queued: true, ...waiting },
      };
    case RenderServiceRetryClass.UNAVAILABLE:
      if (unavailableRuns + 1 >= MAX_UNAVAILABLE_RUNS) {
        return { action: RenderRetryAction.FAIL, reason: RenderRetryReason.UNAVAILABLE };
      }
      return {
        action: RenderRetryAction.RESCHEDULE,
        reason: RenderRetryReason.UNAVAILABLE,
        runAt: later(),
        state: { unavailableRuns: unavailableRuns + 1, queued: true, ...waiting },
      };
    case RenderServiceRetryClass.RENDER_FAILURE: {
      if (attempts >= maxAttempts) {
        return { action: RenderRetryAction.FAIL, reason: RenderRetryReason.RENDER_FAILURE };
      }
      const runAt = later();
      return {
        action: RenderRetryAction.RESCHEDULE,
        reason: RenderRetryReason.RENDER_FAILURE,
        runAt,
        // The next render's wait for a slot starts here.
        state: { unavailableRuns, queued: false, waitingSince: runAt.getTime() },
      };
    }
    case RenderServiceRetryClass.UNRECOVERABLE:
      return {
        action: RenderRetryAction.FAIL,
        reason:
          error instanceof RenderCapacityTimeoutError
            ? RenderRetryReason.SATURATED
            : RenderRetryReason.REJECTED,
      };
  }
}

/**
 * Task Manager's attempts restart at 1 after a `{ runAt }` result, so a higher count means the run
 * after queuing failed.
 */
export function isNewAttempt(state: RenderRetryState | undefined, taskAttempts: number): boolean {
  return !state?.queued || taskAttempts > 1;
}

/** After a reschedule Task Manager's count restarts, so the report's own count wins. */
export function attemptsMade(
  state: RenderRetryState | undefined,
  taskAttempts: number,
  reportAttempts: number
): number {
  return state?.queued === undefined ? taskAttempts : Math.max(taskAttempts, reportAttempts);
}
