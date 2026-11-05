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
import { createInvalidationRunner } from '@kbn/response-ops-api-keys';
import { ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server/constants/saved_objects';
import type { AlertingConfig } from '../config';
import type { AlertingPluginsStart } from '../plugin';
import { stateSchemaByVersion, emptyState, type LatestTaskStateSchema } from './task_state';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '..';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../saved_objects';
import { ALERTING_PLUGIN_TAG } from '../api_keys/client';

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
  const runner = createInvalidationRunner({
    logger,
    pluginTag: ALERTING_PLUGIN_TAG,
    removalDelay: config.invalidateApiKeysTask.removalDelay,
    onError: (error) =>
      logger.warn(
        `Error executing alerting apiKey invalidation task: ${
          error instanceof Error ? error.message : String(error)
        }`
      ),
    getRunDependencies: async () => {
      const [{ savedObjects, security: securityCore }, { encryptedSavedObjects, security }] =
        await coreStartServices;
      return {
        encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
          includedHiddenTypes: [API_KEY_PENDING_INVALIDATION_TYPE],
        }),
        invalidateApiKeyFn: security?.authc.apiKeys.invalidateAsInternalUser,
        invalidateUiamApiKeyFn: securityCore.authc.apiKeys.uiam?.invalidate,
        savedObjectsClient: savedObjects.createInternalRepository([
          API_KEY_PENDING_INVALIDATION_TYPE,
          AD_HOC_RUN_SAVED_OBJECT_TYPE,
          ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
        ]),
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
          // A UIAM key is queued for invalidation under its own id in the pending SO's
          // `apiKeyId`, but pending jobs record that id in `uiamApiKeyId`, so the paths above
          // can never match it. Each path is queried separately and the in-use hits are
          // unioned, so adding these can only move a key from "invalidate" to "in use":
          // objects predating the field (or written by an older node mid-rolling-upgrade)
          // simply keep today's behavior instead of becoming newly at risk.
          {
            type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
            apiKeyAttributePath: `${AD_HOC_RUN_SAVED_OBJECT_TYPE}.attributes.uiamApiKeyId`,
          },
          {
            type: ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
            apiKeyAttributePath: `${ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE}.attributes.uiamApiKeyId`,
          },
        ],
      };
    },
  });

  return ({ taskInstance }: RunContext) => ({
    async run() {
      const state: LatestTaskStateSchema = await runner.run(
        taskInstance.state as LatestTaskStateSchema
      );
      return {
        state,
        schedule: {
          interval: config.invalidateApiKeysTask.interval,
        },
      };
    },
  });
}
