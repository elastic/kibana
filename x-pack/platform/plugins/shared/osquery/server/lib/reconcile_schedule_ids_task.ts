/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Task Manager registration for the reconciler: a one-shot scheduled on every
// start(), re-arming with backoff on failure rather than running recurring.

import type { CoreStart, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { OsqueryAppContextService } from './osquery_app_context_services';
import { reconcileScheduleIdsToWire } from './reconcile_schedule_ids_to_wire';

// Historically named `backfillScheduleIds`; kept so existing scheduled tasks
// aren't orphaned on upgrade (the task now reconciles, not backfills).
export const RECONCILE_TASK_TYPE = 'osquery:backfillScheduleIds';

// Base retry delay: long enough for a concurrent policy write (likely 409
// cause) to settle.
export const RECONCILE_RETRY_DELAY_MS = 5 * 60 * 1000;

// Cap so a persistently failing pass never retries more than once a day.
export const RECONCILE_RETRY_MAX_DELAY_MS = 24 * 60 * 60 * 1000;

/** Shape of the state we persist between runs to drive the backoff. */
export interface ReconcileTaskState {
  completed?: boolean;
  /** Consecutive failed-pass count; drives the exponential backoff delay. */
  retryAttempts?: number;
}

export const computeBackoffDelayMs = (priorAttempts: number): number =>
  Math.min(RECONCILE_RETRY_DELAY_MS * 2 ** priorAttempts, RECONCILE_RETRY_MAX_DELAY_MS);

export const buildReconcileTaskSchedule = (runAt: Date) => ({
  id: RECONCILE_TASK_TYPE,
  taskType: RECONCILE_TASK_TYPE,
  scope: ['osquery'],
  runAt,
  params: {},
  state: {},
});

// Failed pass re-arms via runAt with exponential backoff; clean pass
// completes and resets the counter.
export const buildReconcileRunResult = (
  hadFailures: boolean,
  now: Date,
  priorState?: ReconcileTaskState
) => {
  if (!hadFailures) {
    return { state: { completed: true, retryAttempts: 0 } };
  }

  const priorAttempts = priorState?.retryAttempts ?? 0;

  return {
    state: { completed: false, retryAttempts: priorAttempts + 1 },
    runAt: new Date(now.getTime() + computeBackoffDelayMs(priorAttempts)),
  };
};

/**
 * Body of the Task Manager `run()` closure, extracted so the glue can be unit
 * tested independently of plugin wiring: runs one reconcile pass and maps the
 * outcome to a run-result via {@link buildReconcileRunResult}.
 *
 * Throws when `coreStart` is missing (Core not started yet) — Task Manager
 * converts that to a FailedRunResult and re-attempts, which is correct: the
 * pass simply hasn't got its dependencies yet.
 */
export const runReconcileTask = async ({
  coreStart,
  osqueryContext,
  logger,
  abortController,
  isRruleFeatureEnabled,
  taskState,
  now = new Date(),
}: {
  coreStart: CoreStart | null;
  osqueryContext: OsqueryAppContextService;
  logger: Logger;
  abortController?: AbortController;
  isRruleFeatureEnabled: boolean;
  taskState?: ReconcileTaskState;
  now?: Date;
}) => {
  if (!coreStart) {
    throw new Error('Core not started');
  }

  const { hadFailures } = await reconcileScheduleIdsToWire({
    coreStart,
    osqueryContext,
    logger,
    abortController,
    isRruleFeatureEnabled,
  });

  return buildReconcileRunResult(hadFailures, now, taskState);
};

// Clears a legacy recurring task doc, then ensures the one-shot is
// scheduled; never throws.
export const scheduleReconcileTask = async (
  taskManager: TaskManagerStartContract | undefined,
  logger: Logger,
  now: Date
): Promise<void> => {
  if (!taskManager) {
    return;
  }

  try {
    let existingTask;
    let getFailedNonNotFound = false;
    try {
      existingTask = await taskManager.get(RECONCILE_TASK_TYPE);
    } catch (err) {
      // not-found → no prior task. Any OTHER get failure must NOT be read as
      // "no task", or a stale recurring doc keeps running on its old interval —
      // so force removeIfExists (idempotent) before re-scheduling.
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        existingTask = undefined;
      } else {
        getFailedNonNotFound = true;
        logger.warn(
          `reconcileScheduleIdsToWire: could not read existing task, forcing cleanup: ${err.message}`
        );
      }
    }

    const hasLegacyRecurringSchedule = existingTask?.schedule?.interval != null;
    if (hasLegacyRecurringSchedule || getFailedNonNotFound) {
      await taskManager.removeIfExists(RECONCILE_TASK_TYPE);
    }

    await taskManager.ensureScheduled(buildReconcileTaskSchedule(now));
  } catch (err) {
    logger.warn(`Failed to schedule reconcileScheduleIdsToWire task: ${err.message}`);
  }
};
