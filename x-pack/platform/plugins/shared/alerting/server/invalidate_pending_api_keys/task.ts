/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, CoreStart } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { runInvalidate } from '@kbn/task-manager-plugin/server';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server/constants/saved_objects';
import type { AlertingConfig } from '../config';
import type { AlertingPluginsStart } from '../plugin';
import { stateSchemaByVersion, emptyState, type LatestTaskStateSchema } from './task_state';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '..';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../saved_objects';

const TASK_TYPE = 'alerts_invalidate_api_keys';
export const TASK_ID = `Alerts-${TASK_TYPE}`;

export function initializeApiKeyInvalidator(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>,
  taskManager: TaskManagerSetupContract,
  config: AlertingConfig
) {
  registerApiKeyInvalidatorTaskDefinition(logger, coreStartServices, taskManager, config);
}

export async function scheduleApiKeyInvalidatorTask(
  logger: Logger,
  config: AlertingConfig,
  taskManager: TaskManagerStartContract
) {
  const interval = config.invalidateApiKeysTask.interval;
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: {
        interval,
      },
      state: emptyState,
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${TASK_ID} task, received ${e.message}`);
  }
}

function registerApiKeyInvalidatorTaskDefinition(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>,
  taskManager: TaskManagerSetupContract,
  config: AlertingConfig
) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Invalidate alert API Keys',
      stateSchemaByVersion,
      createTaskRunner: taskRunner(logger, coreStartServices, config),
    },
  });
}

export function taskRunner(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>,
  config: AlertingConfig
) {
  return ({ taskInstance }: RunContext) => {
    const state = taskInstance.state as LatestTaskStateSchema;
    return {
      async run() {
        let totalInvalidated = 0;
        try {
          const [{ savedObjects }, { encryptedSavedObjects, security }] = await coreStartServices;
          const savedObjectsClient = savedObjects.createInternalRepository([
            API_KEY_PENDING_INVALIDATION_TYPE,
            AD_HOC_RUN_SAVED_OBJECT_TYPE,
            ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
          ]);
          const encryptedSavedObjectsClient = encryptedSavedObjects.getClient({
            includedHiddenTypes: [API_KEY_PENDING_INVALIDATION_TYPE],
          });

          totalInvalidated = await runInvalidate({
            encryptedSavedObjectsClient,
            invalidateApiKeyFn: security?.authc.apiKeys.invalidateAsInternalUser,
            logger,
            removalDelay: config.invalidateApiKeysTask.removalDelay,
            savedObjectsClient,
            savedObjectType: API_KEY_PENDING_INVALIDATION_TYPE,
            savedObjectTypesToQuery: [
              {
                type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
                apiKeyAttributePath: `${AD_HOC_RUN_SAVED_OBJECT_TYPE}.attributes.apiKeyId`,
              },
              {
                type: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
                apiKeyAttributePath: `${ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE}.attributes.apiKeyId`,
              },
            ],
          });

          const updatedState: LatestTaskStateSchema = {
            runs: (state.runs || 0) + 1,
            total_invalidated: totalInvalidated,
          };
          return {
            state: updatedState,
            schedule: {
              interval: config.invalidateApiKeysTask.interval,
            },
          };
        } catch (e) {
          logger.warn(`Error executing alerting apiKey invalidation task: ${e.message}`);
          const updatedState: LatestTaskStateSchema = {
            runs: state.runs + 1,
            total_invalidated: totalInvalidated,
          };
          return {
            state: updatedState,
            schedule: {
              interval: config.invalidateApiKeysTask.interval,
            },
          };
        }
      },
    };
  };
}
