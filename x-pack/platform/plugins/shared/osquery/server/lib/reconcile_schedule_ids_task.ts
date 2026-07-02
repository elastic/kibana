/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Task Manager registration for the schedule-id reconciler: schedules a
// one-shot on every start(), re-arming with backoff on failure instead of
// running as a recurring task.

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

// Persisted Task Manager task-type id. Kept historically named
// `backfillScheduleIds` so existing scheduled tasks are not orphaned across an
// upgrade, even though the task now reconciles rather than backfills.
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
    try {
      existingTask = await taskManager.get(RECONCILE_TASK_TYPE);
    } catch (err) {
      existingTask = undefined;
    }

    const hasLegacyRecurringSchedule = existingTask?.schedule?.interval != null;
    if (hasLegacyRecurringSchedule) {
      await taskManager.removeIfExists(RECONCILE_TASK_TYPE);
    }

    await taskManager.ensureScheduled(buildReconcileTaskSchedule(now));
  } catch (err) {
    logger.warn(`Failed to schedule reconcileScheduleIdsToWire task: ${err.message}`);
  }
};
