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
 * Exported because operator routes (`/reconcile/run_soon`, `/reset`) need to
 * pass it to `taskManager.runSoon(id)` — that API takes the task **instance**
 * id, not the task **type**.
 */
export const RECONCILIATION_TASK_ID = 'cases-analyticsV2-reconciliation';

/**
 * Default reconciliation cadence. 30 minutes balances "catch up quickly when
 * a real-time hook fails" against "don't hammer ES with redundant walks."
 * Operators can override on a per-task-instance basis via Task Manager APIs
 * if their tenant needs a different cadence.
 */
const RECONCILIATION_INTERVAL = '30m';

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
          const lastRunAt = previousState.last_run_at;

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
}

/**
 * Ensures the singleton reconciliation task instance exists on the cluster.
 * Idempotent — safe to call on every node start; Task Manager dedupes by id.
 */
export async function scheduleReconciliationTask({
  taskManager,
  logger,
}: ScheduleReconciliationTaskArgs): Promise<void> {
  try {
    await taskManager.ensureScheduled({
      id: RECONCILIATION_TASK_ID,
      taskType: RECONCILIATION_TASK_TYPE,
      params: {},
      schedule: { interval: RECONCILIATION_INTERVAL },
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
