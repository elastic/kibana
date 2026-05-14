/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CasesAnalyticsV2WriterContract } from '../writer';
import { runReconciliation } from './runner';

/**
 * Task type registered with Task Manager. Namespaced with `cases.analyticsV2.`
 * so it's distinct from the v1 task types in `cases_analytics/`.
 */
export const RECONCILIATION_TASK_TYPE = 'cases.analyticsV2.reconciliation';

/**
 * Singleton task instance — one reconciliation task per cluster, regardless of
 * how many Kibana nodes are running. Task Manager assigns it to one node at a
 * time. The id is constant so concurrent boots converge on the same scheduled
 * task rather than each scheduling its own.
 *
 * Exported because administrator routes (`/reconcile/run_soon`, `/reset`)
 * need to pass it to `taskManager.runSoon(id)` — that API takes the task
 * **instance** id, not the task **type**.
 */
export const RECONCILIATION_TASK_ID = 'cases-analyticsV2-reconciliation';

interface RegisterReconciliationTaskArgs {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  /**
   * Late-bound deps. Task Manager constructs task runners well after plugin
   * `setup()` runs — we resolve the SO client and the live writer at run
   * time via this closure rather than baking them in at registration.
   */
  getRunnerDeps: () => Promise<{
    savedObjectsClient: SavedObjectsClientContract;
    writer: CasesAnalyticsV2WriterContract;
  }>;
}

/**
 * Registers the reconciliation task TYPE with Task Manager. Must be called
 * from plugin `setup()`. Scheduling the task instance happens separately in
 * `scheduleReconciliationTask`, from `start()`.
 */
export function registerReconciliationTask({
  taskManager,
  logger,
  getRunnerDeps,
}: RegisterReconciliationTaskArgs): void {
  taskManager.registerTaskDefinitions({
    [RECONCILIATION_TASK_TYPE]: {
      title: 'Cases analytics v2 reconciliation',
      description:
        'Periodically re-emits analytics docs for cases updated since the last successful tick. Durability backstop for the fire-and-forget write hooks.',
      createTaskRunner: ({ taskInstance }) => ({
        run: async () => {
          // Pull the cursor off the previous tick's state. Task Manager
          // persists `state` between runs atomically.
          const previousState = (taskInstance.state ?? {}) as { last_run_at?: string };
          const lastRunAt = clampCursorToNotFuture(previousState.last_run_at, logger);

          try {
            const deps = await getRunnerDeps();
            const result = await runReconciliation({ ...deps, logger, lastRunAt });
            return {
              state: { last_run_at: result.newLastRunAt },
            };
          } catch (err) {
            // Failure during the tick: log loudly, leave state unchanged so
            // the next tick re-walks the same window. Task Manager will
            // retry per its own policy. Rethrowing lets it count this as a
            // failure for telemetry.
            logger.error(
              `cases-analyticsV2: reconciliation tick failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
              { error: err }
            );
            throw err;
          }
        },
        cancel: async () => {
          // The runner is just SO walks and writer dispatch — no long-lived
          // resources to release. Task Manager calling cancel just stops the
          // next page fetch; in-flight writer dispatches complete on their
          // own retry budget.
        },
      }),
    },
  });
}

interface ScheduleReconciliationTaskArgs {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  /**
   * Reconciliation cadence in minutes. Sourced from
   * `xpack.cases.analyticsV2.reconciliationIntervalMinutes` and validated
   * by the config schema (`min: 5`, `defaultValue: 30`). Threaded all the
   * way through from the v2 service so the schedule honours per-tenant
   * tuning instead of a hard-coded default.
   */
  intervalMinutes: number;
}

/**
 * Ensures the singleton reconciliation task instance exists on the cluster.
 * Idempotent — safe to call on every node start; Task Manager dedupes by id.
 */
export async function scheduleReconciliationTask({
  taskManager,
  logger,
  intervalMinutes,
}: ScheduleReconciliationTaskArgs): Promise<void> {
  try {
    await taskManager.ensureScheduled({
      id: RECONCILIATION_TASK_ID,
      taskType: RECONCILIATION_TASK_TYPE,
      params: {},
      // Task Manager parses the "Nm" form as "every N minutes". The number
      // is config-validated upstream (see `xpack.cases.analyticsV2.reconciliationIntervalMinutes`).
      schedule: { interval: `${intervalMinutes}m` },
      state: {},
    });
  } catch (err) {
    // Don't propagate — analytics is a downstream feature; failure to
    // schedule reconciliation must not break plugin start.
    logger.error(
      `cases-analyticsV2: failed to schedule reconciliation task: ${
        err instanceof Error ? err.message : String(err)
      }`,
      { error: err }
    );
  }
}

/**
 * Clears the reconciliation task's persisted state by removing and
 * re-scheduling the task SO. The fresh task starts with `state: {}`, so the
 * runner sees `last_run_at === undefined` and walks every case — exactly what
 * the `/reset` endpoint needs after dropping and recreating the index.
 *
 * **Why remove + re-schedule** instead of mutating state in place? Task
 * Manager's state-mutation APIs (`bulkUpdateState`, etc.) update the task
 * SO atomically, but they fail if the SO is locked by an in-flight tick or
 * doesn't exist yet. Remove + re-schedule is robust to both cases: missing
 * task → recreated cleanly; in-flight tick → the running tick completes
 * against the old state, the new task starts with empty state on its next
 * tick. Idempotent: a missing task on remove is a no-op.
 */
export async function resetReconciliationTask({
  taskManager,
  logger,
  intervalMinutes,
}: ScheduleReconciliationTaskArgs): Promise<void> {
  try {
    await taskManager.remove(RECONCILIATION_TASK_ID);
  } catch (err) {
    // 404 = task wasn't scheduled (first-ever reset, or task was manually
    // deleted). Either way, our post-state ("no task with stale state") is
    // already met — log at debug and proceed to re-schedule.
    const status =
      (err as { statusCode?: number })?.statusCode ??
      (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
    if (status !== 404) {
      logger.warn(
        `cases-analyticsV2: failed to remove reconciliation task during reset: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
  // Re-schedule with the same configured interval the route handler
  // received from the v2 service.
  await scheduleReconciliationTask({ taskManager, logger, intervalMinutes });
}

/**
 * Guard against a corrupted persisted cursor that points to a time later
 * than the current wall clock. This can happen from clock skew between
 * Kibana nodes or from manual SO tampering. Without the clamp,
 * incremental reconciliation silently freezes until wall time catches up.
 *
 * Returns the original cursor when valid, otherwise `undefined` (forces
 * the next tick to walk every case as a backfill — slower than incremental
 * but correct, vs. silently doing nothing).
 *
 * Exported for tests.
 */
export function clampCursorToNotFuture(
  lastRunAt: string | undefined,
  logger: Logger
): string | undefined {
  if (lastRunAt == null) return undefined;
  const cursorMs = Date.parse(lastRunAt);
  if (Number.isNaN(cursorMs)) {
    logger.warn(
      `cases-analyticsV2: persisted reconciliation cursor is unparseable (${lastRunAt}); treating as a fresh backfill`
    );
    return undefined;
  }
  if (cursorMs > Date.now()) {
    logger.warn(
      `cases-analyticsV2: persisted reconciliation cursor is in the future (${lastRunAt}); treating as a fresh backfill to avoid silently skipping recent updates`
    );
    return undefined;
  }
  return lastRunAt;
}
