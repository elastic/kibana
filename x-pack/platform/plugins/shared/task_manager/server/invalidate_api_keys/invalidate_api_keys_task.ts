/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type {
  ApiKeyInvalidationFn,
  ApiKeyInvalidationTaskState,
  InvalidationRunner,
  UiamApiKeyInvalidationFn,
} from '@kbn/response-ops-api-keys';
import {
  apiKeyInvalidationTaskStateSchemaByVersion,
  createInvalidationRunner,
  emptyApiKeyInvalidationTaskState,
} from '@kbn/response-ops-api-keys';
import { TASK_MANAGER_PLUGIN_TAG } from '../api_keys/client';
import type { TaskScheduling } from '../task_scheduling';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import { INVALIDATE_API_KEY_SO_NAME, TASK_SO_NAME } from '../saved_objects';
import type { TaskManagerStartContract } from '..';
import type { TaskManagerPluginsStart } from '../plugin';
import { getSOIdsUsedByRunningTasks } from './get_so_ids_used_by_running_tasks';

export const TASK_ID = 'invalidate_api_keys';
const TASK_TYPE = `task_manager:${TASK_ID}`;

export type { ApiKeyInvalidationFn, UiamApiKeyInvalidationFn };

export async function scheduleInvalidateApiKeyTask(
  logger: Logger,
  taskScheduling: TaskScheduling,
  interval: string
) {
  try {
    await taskScheduling.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: { interval },
      state: emptyApiKeyInvalidationTaskState,
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${TASK_ID} task, received ${e.message}`);
  }
}

interface RegisterInvalidateApiKeyTaskOpts {
  configInterval: string;
  coreStartServices: () => Promise<[CoreStart, TaskManagerPluginsStart, TaskManagerStartContract]>;
  getEncryptedSavedObjectsClient: () => EncryptedSavedObjectsClient | undefined;
  invalidateApiKeyFn?: ApiKeyInvalidationFn;
  invalidateUiamApiKeyFn?: () => UiamApiKeyInvalidationFn | undefined;
  logger: Logger;
  removalDelay: string;
  taskTypeDictionary: TaskTypeDictionary;
}

export function registerInvalidateApiKeyTask(opts: RegisterInvalidateApiKeyTaskOpts) {
  const {
    logger,
    configInterval,
    coreStartServices,
    getEncryptedSavedObjectsClient,
    invalidateApiKeyFn,
    invalidateUiamApiKeyFn,
    removalDelay,
    taskTypeDictionary,
  } = opts;
  taskTypeDictionary.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Invalidate task manager API keys',
      stateSchemaByVersion: apiKeyInvalidationTaskStateSchemaByVersion,
      createTaskRunner: taskRunner({
        logger,
        configInterval,
        coreStartServices,
        getEncryptedSavedObjectsClient,
        invalidateApiKeyFn,
        invalidateUiamApiKeyFn,
        removalDelay,
      }),
    },
  });
}

type InvalidateApiKeysTaskRunnerOpts = Pick<
  RegisterInvalidateApiKeyTaskOpts,
  | 'logger'
  | 'configInterval'
  | 'coreStartServices'
  | 'getEncryptedSavedObjectsClient'
  | 'invalidateApiKeyFn'
  | 'invalidateUiamApiKeyFn'
  | 'removalDelay'
>;

function createTaskManagerInvalidationRunner(
  opts: Omit<InvalidateApiKeysTaskRunnerOpts, 'configInterval'>
): InvalidationRunner {
  const {
    logger,
    coreStartServices,
    getEncryptedSavedObjectsClient,
    invalidateApiKeyFn,
    invalidateUiamApiKeyFn,
    removalDelay,
  } = opts;
  return createInvalidationRunner({
    logger,
    pluginTag: TASK_MANAGER_PLUGIN_TAG,
    removalDelay,
    getRunDependencies: async () => {
      const [{ savedObjects }] = await coreStartServices();
      const savedObjectsClient = savedObjects.createInternalRepository([
        INVALIDATE_API_KEY_SO_NAME,
        TASK_SO_NAME,
      ]);
      return {
        encryptedSavedObjectsClient: getEncryptedSavedObjectsClient(),
        getIdsUsedByRunningTasks: (runningTasks) =>
          getSOIdsUsedByRunningTasks(runningTasks, savedObjectsClient),
        invalidateApiKeyFn,
        invalidateUiamApiKeyFn: invalidateUiamApiKeyFn?.(),
        savedObjectsClient,
        savedObjectType: INVALIDATE_API_KEY_SO_NAME,
        savedObjectTypesToQuery: [
          {
            type: TASK_SO_NAME,
            apiKeyAttributePath: `${TASK_SO_NAME}.attributes.userScope.apiKeyId`,
          },
          // UIAM key ids live in their own attribute, so they are invisible to the
          // `apiKeyId` query above. Without this entry a UIAM key that is still
          // referenced by a live task would be invalidated: keys are granted per task
          // type, so a single UIAM key is routinely shared by several tasks.
          {
            type: TASK_SO_NAME,
            apiKeyAttributePath: `${TASK_SO_NAME}.attributes.userScope.uiamApiKeyId`,
          },
        ],
      };
    },
  });
}

export function taskRunner(opts: InvalidateApiKeysTaskRunnerOpts) {
  const runner = createTaskManagerInvalidationRunner(opts);
  return ({ taskInstance }: { taskInstance: { state: Partial<ApiKeyInvalidationTaskState> } }) => ({
    async run() {
      return {
        state: await runner.run(taskInstance.state),
        schedule: { interval: opts.configInterval },
      };
    },
  });
}
