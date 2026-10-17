/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One-time repair shipped in 9.6 alongside the incremental-id task fix that
 * mirrors newly assigned ids to `.cases`. Before that fix, a case whose
 * `.cases` doc was written before it was numbered never received
 * `case.incremental_id`, because the id is applied with a raw SO update that
 * doesn't bump the `attributes.updated_at` reconciliation filters on.
 *
 * Remove in 9.7: delete this folder, its wiring in `../service.ts`, and its
 * entry in `check_registered_task_types.ts`, and add the task type to Task
 * Manager's `REMOVED_TYPES`.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CasesAnalyticsV2WriterContract } from '../writer';
import { runIncrementalIdBackfill } from './runner';

export const INCREMENTAL_ID_BACKFILL_TASK_TYPE = 'cases.analyticsV2.incrementalIdBackfill';
export const INCREMENTAL_ID_BACKFILL_TASK_ID = 'cases-analyticsV2-incremental-id-backfill';

interface RegisterIncrementalIdBackfillTaskArgs {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  /** Resolved at run time; must throw if the service hasn't started. */
  getRunnerDeps: () => Promise<{
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
    writer: CasesAnalyticsV2WriterContract;
  }>;
}

export function registerIncrementalIdBackfillTask({
  taskManager,
  logger,
  getRunnerDeps,
}: RegisterIncrementalIdBackfillTaskArgs): void {
  taskManager.registerTaskDefinitions({
    [INCREMENTAL_ID_BACKFILL_TASK_TYPE]: {
      title: 'Cases analytics v2 incremental id backfill',
      description:
        'One-time repair that re-emits .cases docs missing case.incremental_id whose case has since been numbered.',
      timeout: '30m',
      maxAttempts: 3,
      createTaskRunner: ({ signal }) => ({
        run: async () => {
          const deps = await getRunnerDeps();
          await runIncrementalIdBackfill({ ...deps, logger, signal });
        },
      }),
    },
  });
}

/**
 * Runs once per Kibana start. Removing first means a task that exhausted its
 * attempts on a previous start doesn't block `ensureScheduled` forever.
 * Re-runs are idempotent and, once repaired, cost a single empty search.
 * Never throws.
 */
export async function scheduleIncrementalIdBackfillTask({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}): Promise<void> {
  try {
    await taskManager.removeIfExists(INCREMENTAL_ID_BACKFILL_TASK_ID);
    await taskManager.ensureScheduled({
      id: INCREMENTAL_ID_BACKFILL_TASK_ID,
      taskType: INCREMENTAL_ID_BACKFILL_TASK_TYPE,
      params: {},
      state: {},
    });
  } catch (err) {
    logger.warn(
      `cases-analyticsV2: failed to schedule incremental id backfill: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
