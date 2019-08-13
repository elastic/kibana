/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { execute } from './execute';
import { ExecutorError } from './executor_error';
import { TaskInstance } from '../../../task_manager';
import { EncryptedSavedObjectsPlugin } from '../../../encrypted_saved_objects';
import {
  ActionTaskParams,
  ActionTypeRegistryContract,
  GetBasePathFunction,
  GetServicesFunction,
  SpaceIdToNamespaceFunction,
} from '../types';

interface CreateTaskRunnerFunctionOptions {
  getServices: GetServicesFunction;
  actionTypeRegistry: ActionTypeRegistryContract;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  getBasePath: GetBasePathFunction;
}

interface TaskRunnerOptions {
  taskInstance: TaskInstance;
}

export function getCreateTaskRunnerFunction({
  getServices,
  actionTypeRegistry,
  encryptedSavedObjectsPlugin,
  spaceIdToNamespace,
  getBasePath,
}: CreateTaskRunnerFunctionOptions) {
  return ({ taskInstance }: TaskRunnerOptions) => {
    return {
      run: async () => {
        const { spaceId, actionTaskParamsId } = taskInstance.params;
        const namespace = spaceIdToNamespace(spaceId);

        const {
          attributes: { actionId, params, apiKeyId, apiKeyValue },
        } = await encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<ActionTaskParams>(
          'action_task_params',
          actionTaskParamsId,
          { namespace }
        );

        const requestHeaders: Record<string, string> = {};
        if (apiKeyId && apiKeyValue) {
          const key = Buffer.from(`${apiKeyId}:${apiKeyValue}`).toString('base64');
          requestHeaders.authorization = `ApiKey ${key}`;
        }

        // Since we're using API keys and accessing elasticsearch can only be done
        // via a request, we're faking one with the proper authorization headers.
        const fakeRequest: any = {
          headers: requestHeaders,
          getBasePath: () => getBasePath(spaceId),
        };

        const executorResult = await execute({
          namespace,
          actionTypeRegistry,
          encryptedSavedObjectsPlugin,
          actionId,
          services: getServices(fakeRequest),
          params,
        });
        if (executorResult.status === 'error') {
          // Task manager error handler only kicks in when an error thrown (at this time)
          // So what we have to do is throw when the return status is `error`.
          throw new ExecutorError(
            executorResult.message,
            executorResult.data,
            executorResult.retry
          );
        }
      },
    };
  };
}
