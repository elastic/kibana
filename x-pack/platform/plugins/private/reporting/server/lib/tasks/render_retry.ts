/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RenderCapacityTimeoutError, RenderServiceError } from '@kbn/reporting-common';
import type { RenderRetryAction, RenderRetryReason } from './reporting_telemetry';

/**
 * The between-runs half of the retry ladder (#754) for page-render-service, which has no queue.
 * The in-run half — waiting out 429s, and giving up once a report has waited 10 minutes — is in
 * the page-render-screenshotting plugin's `retry_ladder.ts`. Delete both when the service gets a
 * queue.
 *
 * Every reschedule is returned to Task Manager as a successful run with a `runAt`, not thrown:
 * a thrown error spends one of the task's attempts, and waiting for capacity can take ten runs.
 * Counts that must survive a reschedule live in the task's state.
 */

/** Runs allowed per failure class, counting the first. */
export const MAX_RENDER_RUNS = { unavailable: 4, render_failure: 3 } as const;
/** Pause before running again after the service failed or could not be reached. */
export const RESCHEDULE_DELAY_MS = 10_000;

type CountedClass = keyof typeof MAX_RENDER_RUNS;

export interface RenderRetryState {
  renderFailures?: Partial<Record<CountedClass, number>>;
  /** The last run handed back while waiting for capacity, so the next is not a new attempt. */
  waitingForCapacity?: boolean;
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

const REASONS: Record<CountedClass, RenderRetryReason> = {
  unavailable: 'unavailable',
  render_failure: 'render_failure',
};

/**
 * What to do about a failed run. Undefined when the error did not come from page-render-service,
 * which leaves it to reporting's usual handling.
 */
export function decideRenderRetry(
  error: unknown,
  state: RenderRetryState | undefined,
  now: number = Date.now(),
  random: () => number = Math.random
): RenderRetryDecision | undefined {
  if (!(error instanceof RenderServiceError)) {
    return undefined;
  }

  const { waitingForCapacity, ...counts } = state ?? {};
  switch (error.retryClass) {
    case 'capacity':
      // Task Manager picks it straight back up, and the next run waits again.
      return {
        action: 'hand_back',
        reason: 'saturated',
        runAt: new Date(now),
        state: { ...counts, waitingForCapacity: true },
      };
    case 'unavailable':
    case 'render_failure': {
      const reason = REASONS[error.retryClass];
      const failures = (counts.renderFailures?.[error.retryClass] ?? 0) + 1;
      if (failures >= MAX_RENDER_RUNS[error.retryClass]) {
        return { action: 'fail', reason };
      }
      return {
        action: 'reschedule',
        reason,
        // ±50%, so reports that failed together do not return together.
        runAt: new Date(now + Math.round(RESCHEDULE_DELAY_MS * (0.5 + random()))),
        state: {
          ...counts,
          renderFailures: { ...counts.renderFailures, [error.retryClass]: failures },
        },
      };
    }
    case 'unrecoverable':
      return {
        action: 'fail',
        reason: error instanceof RenderCapacityTimeoutError ? 'saturated' : 'rejected',
      };
  }
}
