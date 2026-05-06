/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  CASES_ANALYTICS_RECONCILIATION_TASK_TYPE,
  CASES_ANALYTICS_STATE_SO_TYPE,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../../common/constants';
import { DEFAULT_RECONCILIATION_INTERVAL } from '../constants';
import type { CasesAnalyticsWriterContract } from '../writer';
import { runReconciliation } from './runner';

export { casesAnalyticsStateSavedObjectType } from './state_so';

interface RegisterArgs {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  /** Resolved at task-run time, not registration time. The plugin's setup phase
   * doesn't have core start yet, but Task Manager invokes the runner lazily. */
  resolveDeps: () => Promise<{
    core: CoreStart;
    writer: CasesAnalyticsWriterContract;
  }>;
}

export const registerReconciliationTask = ({
  taskManager,
  logger,
  resolveDeps,
}: RegisterArgs): void => {
  taskManager.registerTaskDefinitions({
    [CASES_ANALYTICS_RECONCILIATION_TASK_TYPE]: {
      title: 'Cases Analytics — Reconciliation',
      description:
        'Periodic backstop that re-emits any case / activity / lifecycle docs missed by the synchronous writer.',
      timeout: '10m',
      maxAttempts: 1,
      createTaskRunner: () => ({
        run: async () => {
          const { core, writer } = await resolveDeps();
          const internalSavedObjectsRepository = core.savedObjects.createInternalRepository([
            CASE_SAVED_OBJECT,
            CASE_USER_ACTION_SAVED_OBJECT,
            CASES_ANALYTICS_STATE_SO_TYPE,
          ]);
          // Use the same internal repo as a "client" — find() exists on both
          // contracts. We don't need request-scoped auth here since the writer is
          // an internal subsystem.
          const unsecuredSavedObjectsClient =
            internalSavedObjectsRepository as unknown as Parameters<
              typeof runReconciliation
            >[0]['unsecuredSavedObjectsClient'];
          await runReconciliation({
            logger,
            internalSavedObjectsRepository,
            unsecuredSavedObjectsClient,
            writer,
          });
        },
        cancel: async () => {},
      }),
    },
  });
};

export const scheduleReconciliationTask = async ({
  taskManager,
  logger,
  intervalOverride,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  intervalOverride?: string;
}): Promise<void> => {
  const interval = intervalOverride ?? DEFAULT_RECONCILIATION_INTERVAL;
  try {
    await taskManager.ensureScheduled({
      id: CASES_ANALYTICS_RECONCILIATION_TASK_TYPE,
      taskType: CASES_ANALYTICS_RECONCILIATION_TASK_TYPE,
      schedule: { interval },
      scope: ['cases'],
      params: {},
      state: {},
    });
    logger.debug(`cases.analytics: reconciliation scheduled (interval=${interval})`);
  } catch (err) {
    logger.warn(`cases.analytics: failed to schedule reconciliation: ${err.message}`);
  }
};
