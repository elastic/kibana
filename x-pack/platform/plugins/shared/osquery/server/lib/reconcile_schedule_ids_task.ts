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
 * Startup contract: on every `start()`, the plugin awaits
 * `taskManager.removeIfExists(RECONCILE_TASK_TYPE)` before calling
 * `ensureScheduled(buildReconcileTaskSchedule(...))`. The removal is
 * 404-tolerant, so a fresh install is a no-op; on an upgraded deployment it
 * clears any stale recurring schedule (and stale `state.completed`) left by
 * an earlier version, so `ensureScheduled` always schedules a clean
 * `runAt`-only single-run instance rather than 409-ing against the old one.
 * This makes the task single-run *per Kibana boot*: it re-arms once on every
 * boot, which is intended — the reconciler is idempotent and diff-gated, so
 * a re-run on an already-in-sync deployment is a cheap no-op that also
 * repairs any wire drift accrued since the last boot.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

// Persisted Task Manager task-type id. Kept historically named
// `backfillScheduleIds` so existing scheduled tasks are not orphaned across an
// upgrade, even though the task now reconciles rather than backfills.
export const RECONCILE_TASK_TYPE = 'osquery:backfillScheduleIds';

// Delay before a partially-failed reconcile pass re-runs. Long enough to let a
// concurrent package-policy write settle (the usual cause of a 409), short
// enough that customers aren't left on a stale wire for long.
export const RECONCILE_RETRY_DELAY_MS = 5 * 60 * 1000;

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
 */
export const buildReconcileRunResult = (hadFailures: boolean, now: Date) =>
  hadFailures
    ? {
        state: { completed: false },
        runAt: new Date(now.getTime() + RECONCILE_RETRY_DELAY_MS),
      }
    : { state: { completed: true } };

/**
 * Startup entry point: enforces the remove-then-reschedule ordering described
 * in the module doc above. The removal MUST be awaited before scheduling —
 * otherwise `ensureScheduled` 409s against a stale pre-existing instance and
 * silently keeps its old (possibly recurring) schedule. Failures from either
 * step are caught and logged as a warning rather than thrown, so a Task
 * Manager hiccup never fails plugin startup.
 */
export const scheduleReconcileTask = async (
  taskManager: TaskManagerStartContract | undefined,
  logger: Logger,
  now: Date
): Promise<void> => {
  try {
    await taskManager?.removeIfExists(RECONCILE_TASK_TYPE);
    await taskManager?.ensureScheduled(buildReconcileTaskSchedule(now));
  } catch (err) {
    logger.warn(`Failed to schedule reconcileScheduleIdsToWire task: ${err.message}`);
  }
};
