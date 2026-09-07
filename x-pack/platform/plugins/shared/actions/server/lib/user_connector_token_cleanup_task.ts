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
} from '@kbn/task-manager-plugin/server';
import { cleanupStaleUserConnectorTokens } from './cleanup_stale_user_connector_tokens';
import { USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

export const USER_CONNECTOR_TOKEN_CLEANUP_TASK_TYPE = 'actions:user_connector_token_cleanup';
export const USER_CONNECTOR_TOKEN_CLEANUP_TASK_ID = `Actions-${USER_CONNECTOR_TOKEN_CLEANUP_TASK_TYPE}`;
export const USER_CONNECTOR_TOKEN_CLEANUP_SCHEDULE: IntervalSchedule = { interval: '1d' };

export function initializeUserConnectorTokenCleanupTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  core: CoreSetup
) {
  taskManager.registerTaskDefinitions({
    [USER_CONNECTOR_TOKEN_CLEANUP_TASK_TYPE]: {
      title: 'User connector token cleanup task',
      description: 'Periodically removes stale per-user OAuth connector tokens',
      timeout: '1m',
      createTaskRunner: () => {
        return {
          run: async () => {
            try {
              const [coreStart] = await core.getStartServices();

              const unsecuredSavedObjectsClient = coreStart.savedObjects.createInternalRepository([
                USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
              ]);

              await cleanupStaleUserConnectorTokens(
                unsecuredSavedObjectsClient,
                logger.get('user_connector_token_cleanup')
              );
            } catch (error) {
              logger.error(
                `User connector token cleanup task failed: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }

            return {
              state: {},
              schedule: USER_CONNECTOR_TOKEN_CLEANUP_SCHEDULE,
            };
          },
        };
      },
    },
  });
}

export function scheduleUserConnectorTokenCleanupTask(
  logger: Logger,
  taskManager: TaskManagerStartContract
) {
  void scheduleTask(logger, taskManager);
}

async function scheduleTask(logger: Logger, taskManager: TaskManagerStartContract) {
  try {
    await taskManager.ensureScheduled({
      id: USER_CONNECTOR_TOKEN_CLEANUP_TASK_ID,
      taskType: USER_CONNECTOR_TOKEN_CLEANUP_TASK_TYPE,
      state: {},
      params: {},
      schedule: USER_CONNECTOR_TOKEN_CLEANUP_SCHEDULE,
    });
  } catch (e) {
    logger.error(
      `Error scheduling ${USER_CONNECTOR_TOKEN_CLEANUP_TASK_ID}, received ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}
