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
   * `setup()` runs — the SO client and live writer are resolved at run time
   * via this closure rather than baked in at registration.
   */
  getRunnerDeps: () => Promise<{
    savedObjectsClient: SavedObjectsClientContract;
    writer: CasesAnalyticsV2WriterContract;
  }>;
}

/**
 * Persisted task state. Per-surface cursor naming so the activity
 * surface can plug in its own field (`activity_last_run_at`) without a
 * one-shot migration when it lands.
 */
interface ReconciliationTaskState {
  cases_last_run_at?: string;
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
      // No auto-retry. The runner pins the cursor on failure and the
      // next scheduled tick re-walks the same window naturally. A retry
      // inside the same poll interval would stack a second failing run
      // on top of an already-stressed cluster — usually the cause of
      // the first failure — and increment the task's failure metric
      // twice. With `maxAttempts: 1`, recovery happens cleanly on the
      // next interval-driven run.
      maxAttempts: 1,
      createTaskRunner: ({ taskInstance }) => ({
        run: async () => {
          const previousState = (taskInstance.state ?? {}) as ReconciliationTaskState;
          const lastRunAt = clampCursorToNotFuture(previousState.cases_last_run_at, logger);

          const deps = await getRunnerDeps();
          const result = await runReconciliation({
            savedObjectsClient: deps.savedObjectsClient,
            writer: deps.writer,
            logger,
            lastRunAt,
          });
          return { state: { cases_last_run_at: result.newLastRunAt } };
        },
        cancel: async () => {
          // The runner is an SO walk plus writer dispatches — no
          // long-lived resources to release. A cancel just stops the
          // next page fetch; in-flight writer dispatches finish on
          // their own retry budget.
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

interface ResetReconciliationTaskArgs extends ScheduleReconciliationTaskArgs {
  /**
   * State to force the persisted task SO to after the reset. Carries the
   * cursor seeded from a successful walk so future periodic ticks walk
   * only the post-walk delta instead of re-emitting every case every
   * interval. Empty (default `{}`) makes the next tick a full backfill,
   * which is rarely what you want — a tenant-wide walk on every periodic
   * tick is expensive.
   */
  initialState?: Record<string, unknown>;
}

/**
 * Resets the reconciliation task's persisted state.
 *
 * Two steps, both required:
 *   1. `scheduleReconciliationTask` (ensure-scheduled). No-op when the
 *      task already exists; creates it with the configured interval
 *      otherwise. Guarantees a task SO is on disk for step 2 to update.
 *   2. `bulkUpdateState`. Atomically rewrites the persisted state to
 *      `initialState`. Preferred over a `remove` + `ensureScheduled`
 *      sequence because:
 *        - it doesn't depend on the remove succeeding (a transient
 *          cluster error during remove would leave the SO alive with
 *          stale state, and `ensureScheduled` would no-op);
 *        - it doesn't race a freshly-scheduled task SO against an
 *          in-flight tick about to write its old state back to the same
 *          id.
 *
 * Race with an in-flight tick: `bulkUpdateState` reads and writes the
 * SO non-atomically, so a tick that completes between this read and
 * write (or starts mid-update) can clobber the persisted cursor. The
 * data effect is benign because the reset's synchronous walk has
 * already repopulated `.cases` from the SO source of truth — at worst,
 * the next periodic tick walks a slightly wider window than necessary,
 * and `writer.upsertCase` is idempotent on `_id`.
 */
export async function resetReconciliationTask({
  taskManager,
  logger,
  intervalMinutes,
  initialState = {},
}: ResetReconciliationTaskArgs): Promise<void> {
  await scheduleReconciliationTask({ taskManager, logger, intervalMinutes });
  try {
    await taskManager.bulkUpdateState([RECONCILIATION_TASK_ID], () => initialState);
  } catch (err) {
    logger.warn(
      `cases-analyticsV2: failed to reset reconciliation task state: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Guards against a persisted cursor that points later than the current
 * wall clock — possible from clock skew between Kibana nodes or manual
 * SO edits. Without the clamp, incremental reconciliation freezes until
 * wall time catches up.
 *
 * Returns the original cursor when valid, otherwise `undefined` so the
 * next tick walks every case as a backfill (slower than incremental but
 * correct).
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
