/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, CoreSetup } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  IntervalSchedule,
  ConcreteTaskInstance,
} from '@kbn/task-manager-plugin/server';
import type { ActionsPluginsStart } from '../plugin';
import { OAuthStateClient } from './oauth_state_client';

export const OAUTH_STATE_CLEANUP_TASK_TYPE = 'actions:oauth_state_cleanup';
export const OAUTH_STATE_CLEANUP_TASK_ID = `Actions-${OAUTH_STATE_CLEANUP_TASK_TYPE}`;
export const OAUTH_STATE_CLEANUP_SCHEDULE: IntervalSchedule = { interval: '30m' };

interface TaskState extends Record<string, unknown> {
  runs: number;
  last_cleanup_count: number;
}

const emptyState: TaskState = {
  runs: 0,
  last_cleanup_count: 0,
};

export function initializeOAuthStateCleanupTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  core: CoreSetup<ActionsPluginsStart>
) {
  registerOAuthStateCleanupTask(logger, taskManager, core);
}

export function scheduleOAuthStateCleanupTask(
  logger: Logger,
  taskManager: TaskManagerStartContract
) {
  scheduleTask(logger, taskManager).catch(() => {
    // catch to prevent unhandled promise rejection
  });
}

function registerOAuthStateCleanupTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  core: CoreSetup<ActionsPluginsStart>
) {
  taskManager.registerTaskDefinitions({
    [OAUTH_STATE_CLEANUP_TASK_TYPE]: {
      title: 'OAuth state cleanup task',
      description: 'Periodically removes expired OAuth state objects',
      timeout: '1m',
      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        return {
          run: async () => {
            const state = taskInstance.state as TaskState;

            try {
              const [coreStart, { encryptedSavedObjects }] = await core.getStartServices();

              const unsecuredSavedObjectsClient = coreStart.savedObjects.createInternalRepository();
              const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
                includedHiddenTypes: ['oauth_state'],
              });
              const oauthStateClient = new OAuthStateClient({
                encryptedSavedObjectsClient,
                unsecuredSavedObjectsClient,
                logger: logger.get('oauth_state_cleanup'),
              });

              const cleanupCount = await oauthStateClient.cleanupExpiredStates();

              const updatedState: TaskState = {
                runs: (state.runs || 0) + 1,
                last_cleanup_count: cleanupCount,
              };

              return {
                state: updatedState,
                schedule: OAUTH_STATE_CLEANUP_SCHEDULE,
              };
            } catch (error) {
              logger.error(
                `OAuth state cleanup task failed: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );

              return {
                state: {
                  runs: (state.runs || 0) + 1,
                  last_cleanup_count: 0,
                },
                schedule: OAUTH_STATE_CLEANUP_SCHEDULE,
              };
            }
          },
        };
      },
    },
  });
}

async function scheduleTask(logger: Logger, taskManager: TaskManagerStartContract) {
  try {
    await taskManager.ensureScheduled({
      id: OAUTH_STATE_CLEANUP_TASK_ID,
      taskType: OAUTH_STATE_CLEANUP_TASK_TYPE,
      state: emptyState,
      params: {},
      schedule: OAUTH_STATE_CLEANUP_SCHEDULE,
    });
  } catch (e) {
    logger.error(
      `Error scheduling ${OAUTH_STATE_CLEANUP_TASK_ID}, received ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}
