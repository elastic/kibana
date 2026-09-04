/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { createInvestigationSweepRepository } from '../storage';
import type {
  NightshiftInvestigationsServerStart,
  NightshiftInvestigationsStartDeps,
} from '../types';
import { reconcileInvestigationStatuses } from './reconcile_investigation_statuses';

export const INVESTIGATION_RECONCILIATION_TASK_TYPE =
  'nightshift-investigations:reconcile_investigation_statuses';

const SCHEDULE_INTERVAL = '5m';

export interface RegisterInvestigationReconciliationTaskDeps {
  core: CoreSetup<NightshiftInvestigationsStartDeps, NightshiftInvestigationsServerStart>;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  getWorkflowsManagement: () => WorkflowsServerPluginSetup | undefined;
}

/**
 * Registers the task that settles investigations whose workflow execution ended without the run
 * persisting the outcome — a cancelled or timed out execution never reaches its persist step.
 */
export const registerInvestigationReconciliationTask = ({
  core,
  taskManager,
  logger,
  getWorkflowsManagement,
}: RegisterInvestigationReconciliationTaskDeps): void => {
  taskManager.registerTaskDefinitions({
    [INVESTIGATION_RECONCILIATION_TASK_TYPE]: {
      title: 'Nightshift investigation status reconciliation',
      description:
        'Settles investigations left in a non-terminal status by a workflow execution that has already reached a terminal state.',
      timeout: '2m',
      // A recurring sweep: a failed run needs no retry because the next run redoes the same work.
      maxAttempts: 1,
      cost: TaskCost.Normal,
      // Bookkeeping that can be deferred under load; nothing is waiting on it.
      priority: TaskPriority.Maintenance,
      createTaskRunner: ({ signal }) => ({
        run: async () => {
          const workflowsManagement = getWorkflowsManagement();
          if (!workflowsManagement) {
            logger.warn(
              'Skipping investigation reconciliation: workflowsManagement is not available'
            );
            return { state: {} };
          }

          const [{ savedObjects }] = await core.getStartServices();

          const { scanned, reconciled } = await reconcileInvestigationStatuses({
            investigationSweepRepository: createInvestigationSweepRepository(savedObjects),
            getExecutionSummaries: async (executionIds, spaceId) => {
              const { results } = await workflowsManagement.management.searchExecutionsView(
                {
                  query: { ids: { values: executionIds } },
                  includeManagedExecutions: true,
                  size: executionIds.length,
                },
                spaceId
              );

              return new Map(results.map((execution) => [execution.id, execution]));
            },
            logger,
            signal,
          });

          if (reconciled > 0) {
            logger.info(
              `Reconciled ${reconciled} of ${scanned} non-terminal investigation(s) against their workflow executions`
            );
          }

          return { state: {} };
        },
      }),
    },
  });
};

export const scheduleInvestigationReconciliationTask = async ({
  taskManager,
}: {
  taskManager: TaskManagerStartContract;
}): Promise<void> => {
  await taskManager.ensureScheduled({
    id: INVESTIGATION_RECONCILIATION_TASK_TYPE,
    taskType: INVESTIGATION_RECONCILIATION_TASK_TYPE,
    schedule: { interval: SCHEDULE_INTERVAL },
    params: {},
    state: {},
  });
};
