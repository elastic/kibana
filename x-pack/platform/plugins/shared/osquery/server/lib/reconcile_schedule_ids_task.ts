/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Task Manager registration/scheduling helpers for the schedule-id wire
 * reconciler (`reconcileScheduleIdsToWire`). Kept out of `plugin.ts` so the
 * one-shot + re-arm contracts are pure, independently unit-testable units
 * (see `reconcile_schedule_ids_task.test.ts`) rather than closures buried in
 * plugin wiring.
 *
 * Startup contract: on every `start()`, the plugin fetches the existing task
 * doc (404-tolerant) and removes it ONLY when it still carries a legacy
 * recurring `schedule` left by an earlier version; otherwise it calls
 * `ensureScheduled` alone (409-tolerant against a live one-shot). This avoids
 * the every-boot delete/recreate race across multi-node clusters — a second
 * node booting while a one-shot is pending or running no longer deletes the
 * live doc out from under the running instance. Precedent: Fleet's
 * `fleet_usage_logger`. Trade-off: a completed one-shot self-deletes its doc,
 * so a later boot re-schedules and re-runs the idempotent, diff-gated pass —
 * a cheap no-op that also repairs any wire drift accrued since the last boot.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

// Persisted Task Manager task-type id. Kept historically named
// `backfillScheduleIds` so existing scheduled tasks are not orphaned across an
// upgrade, even though the task now reconciles rather than backfills.
export const RECONCILE_TASK_TYPE = 'osquery:backfillScheduleIds';

// Base delay before a partially-failed reconcile pass re-runs. Long enough to
// let a concurrent package-policy write settle (the usual cause of a 409),
// short enough that customers aren't left on a stale wire for long. The first
// retry uses exactly this; each consecutive failure doubles it.
export const RECONCILE_RETRY_DELAY_MS = 5 * 60 * 1000;

// Ceiling for the exponential backoff so a persistently failing pass never
// re-arms more than once a day (avoids a hot retry loop against a genuinely
// broken policy while still self-healing eventually).
export const RECONCILE_RETRY_MAX_DELAY_MS = 24 * 60 * 60 * 1000;

/** Shape of the state we persist between runs to drive the backoff. */
export interface ReconcileTaskState {
  completed?: boolean;
  /** Consecutive failed-pass count; drives the exponential backoff delay. */
  retryAttempts?: number;
}

/**
 * Compute the next re-arm delay from the count of prior consecutive failures:
 * `min(base * 2^priorAttempts, cap)`. `priorAttempts === 0` (the first failure)
 * yields exactly the base delay.
 */
export const computeBackoffDelayMs = (priorAttempts: number): number =>
  Math.min(RECONCILE_RETRY_DELAY_MS * 2 ** priorAttempts, RECONCILE_RETRY_MAX_DELAY_MS);

/**
 * Build the Task Manager `ensureScheduled` params for the reconciler. The
 * one-shot contract is pinned here: `runAt` is set (run promptly, once) and
 * there is NO recurring `schedule`.
 */
export const buildReconcileTaskSchedule = (runAt: Date) => ({
  id: RECONCILE_TASK_TYPE,
  taskType: RECONCILE_TASK_TYPE,
  scope: ['osquery'],
  runAt,
  params: {},
  state: {},
});

/**
 * Run result for this single-run task: a failed pass re-arms via a near-future
 * `runAt` (a single-run task that returns no `runAt` is never re-run, so
 * `completed: false` alone would abandon it); a clean pass ends the task.
 *
 * The re-arm delay grows with capped exponential backoff, driven by the
 * `retryAttempts` count threaded through task state: the first failure re-arms
 * at the base delay (5m) and records one attempt; each consecutive failure
 * doubles the delay up to the 24h cap. A clean pass clears the counter and
 * completes the task, so a later transient failure starts the backoff over.
 */
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
 * Startup entry point: conditionally clears a legacy recurring task, then
 * ensures the one-shot is scheduled.
 *
 * We remove the persisted doc ONLY when it still carries a legacy recurring
 * `schedule` (an earlier version registered this task type as recurring). A
 * live one-shot doc — pending or running on another node — is left untouched,
 * and `ensureScheduled` 409-no-ops against it. This eliminates the every-boot
 * delete/recreate race that could delete a doc mid-run on multi-node clusters.
 *
 * Failures from any step are caught and logged as a warning rather than
 * thrown, so a Task Manager hiccup never fails plugin startup.
 */
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
      // 404 (no existing doc) is the fresh-install / self-deleted-one-shot
      // path — nothing to remove, fall through to ensureScheduled.
      existingTask = undefined;
    }

    // A legacy recurring doc carries `schedule.interval`; a modern one-shot
    // carries only `runAt`. Remove only the legacy recurring shape so a live
    // one-shot on another node is never deleted mid-flight.
    const hasLegacyRecurringSchedule = existingTask?.schedule?.interval != null;
    if (hasLegacyRecurringSchedule) {
      await taskManager.removeIfExists(RECONCILE_TASK_TYPE);
    }

    await taskManager.ensureScheduled(buildReconcileTaskSchedule(now));
  } catch (err) {
    logger.warn(`Failed to schedule reconcileScheduleIdsToWire task: ${err.message}`);
  }
};
