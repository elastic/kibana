/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import { appContextService } from '../../services';

import { syncAgentlessDeployments } from '../../services/agentless/deployment_sync';
import { agentlessAgentService } from '../../services/agents/agentless_agent';
import { type FleetConfigType } from '../../config';

const TASK_TYPE = 'fleet:agentless-deployment-sync-task';
const TASK_TITLE = 'Fleet agentless deployment sync Task';
const TASK_TIMEOUT = '10m';

const TASK_ID = `${TASK_TYPE}:1.0.0`;

export function registerAgentlessDeploymentSyncTask(
  taskManager: TaskManagerSetupContract,
  config: FleetConfigType
) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
      maxAttempts: 1,
      createTaskRunner: ({
        taskInstance,
        abortController,
      }: {
        taskInstance: ConcreteTaskInstance;
        abortController: AbortController;
      }) => {
        const logger = appContextService.getLogger().get('agentless');

        return {
          run: async () => {
            logger.debug(`Starting agentless deployment sync`);

            try {
              await syncAgentlessDeployments(
                {
                  agentlessAgentService,
                  logger,
                },
                {
                  dryRun: config?.agentless?.enabled && config?.agentless?.backgroundSync?.dryRun,
                  abortController,
                }
              );
            } catch (error) {
              logger.error(`agentless deployment sync failed`, { error });
              throw error;
            }
          },
          cancel: async () => {
            logger.debug(`Fleet agentless deployment sync timed out`);
          },
        };
      },
    },
  });
}

export async function scheduleAgentlessDeploymentSyncTask(
  taskManager: TaskManagerStartContract,
  config: FleetConfigType
) {
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      enabled: config?.agentless?.enabled && config?.agentless?.backgroundSync?.enabled,
      schedule: {
        interval: config?.agentless?.backgroundSync?.interval ?? '1h',
      },
      state: {},
      params: {},
    });
  } catch (error) {
    appContextService
      .getLogger()
      .error(`Error scheduling agentless deployment sync task.`, { error });
  }
}
