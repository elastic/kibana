/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RenderCapacityTimeoutError, RenderServiceError } from '@kbn/reporting-common';
import type { RenderRetryAction, RenderRetryReason } from './reporting_telemetry';

/**
 * The between-runs half of the page-render-service retry ladder. The in-run half is
 * `retry_ladder.ts` in the page-render-screenshotting plugin. Delete both when the service gets a
 * queue.
 *
 * Reschedules return `{ runAt, state }` as a successful run rather than throwing: a thrown error
 * spends one of the task's attempts, and waiting for capacity can take ten runs. Waiting for
 * capacity or for an unreachable service is queuing, not an attempt; a failed render is an attempt.
 */

/** Runs allowed while the service cannot be reached, counting the first. */
export const MAX_UNAVAILABLE_RUNS = 4;
/** Before rerunning after an `unavailable` or `render_failure` error. */
export const RESCHEDULE_DELAY_MS = 10_000;

export interface RenderRetryState {
  unavailableRuns?: number;
  /** Set on every reschedule; true when the last run was queuing, so the next is no new attempt. */
  queued?: boolean;
}

export type RenderRetryDecision =
  | {
      action: Extract<RenderRetryAction, 'hand_back' | 'reschedule'>;
      reason: RenderRetryReason;
      runAt: Date;
      // Task Manager stores state as a plain record.
      state: RenderRetryState & Record<string, unknown>;
    }
  | { action: Extract<RenderRetryAction, 'fail'>; reason: RenderRetryReason };

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
  const { unavailableRuns = 0 } = state ?? {};
  switch (error.retryClass) {
    case 'capacity':
      // Task Manager picks it straight back up, and the next run waits again.
      return {
        action: 'hand_back',
        reason: 'saturated',
        runAt: new Date(now),
        state: { unavailableRuns, queued: true },
      };
    case 'unavailable':
      if (unavailableRuns + 1 >= MAX_UNAVAILABLE_RUNS) {
        return { action: 'fail', reason: 'unavailable' };
      }
      return {
        action: 'reschedule',
        reason: 'unavailable',
        runAt: later(),
        state: { unavailableRuns: unavailableRuns + 1, queued: true },
      };
    case 'render_failure':
      if (attempts >= maxAttempts) {
        return { action: 'fail', reason: 'render_failure' };
      }
      return {
        action: 'reschedule',
        reason: 'render_failure',
        runAt: later(),
        state: { unavailableRuns, queued: false },
      };
    case 'unrecoverable':
      return {
        action: 'fail',
        reason: error instanceof RenderCapacityTimeoutError ? 'saturated' : 'rejected',
      };
  }
}

/**
 * Whether this run is a new attempt on the report. Returning `{ runAt }` resets Task Manager's
 * attempts, so a run after queuing is claimed as attempt 1; a later one followed a thrown failure.
 */
export function isNewAttempt(state: RenderRetryState | undefined, taskAttempts: number): boolean {
  return !state?.queued || taskAttempts > 1;
}

/**
 * Attempts made on the report so far. After a reschedule Task Manager's count restarts, so the
 * report's own count, which skips queuing runs, is the one to trust.
 */
export function attemptsMade(
  state: RenderRetryState | undefined,
  taskAttempts: number,
  reportAttempts: number
): number {
  return state?.queued === undefined ? taskAttempts : Math.max(taskAttempts, reportAttempts);
}
