/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { execute } from './execute';
import { ExecutorError } from './executor_error';
import { ActionTypeRegistryContract, GetServicesFunction } from '../types';
import { TaskInstance } from '../../../task_manager';
import { EncryptedSavedObjectsPlugin } from '../../../encrypted_saved_objects';
import { SpacesPlugin } from '../../../spaces';

interface CreateTaskRunnerFunctionOptions {
  getServices: GetServicesFunction;
  actionTypeRegistry: ActionTypeRegistryContract;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
  spaceIdToNamespace: SpacesPlugin['spaceIdToNamespace'];
  getBasePath: SpacesPlugin['getBasePath'];
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
        const { spaceId, id, actionTypeParams } = taskInstance.params;
        const namespace = spaceIdToNamespace(spaceId);
        const executorResult = await execute({
          namespace,
          actionTypeRegistry,
          encryptedSavedObjectsPlugin,
          actionId: id,
          services: getServices(taskInstance.params.basePath),
          params: actionTypeParams,
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
