/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { execute } from './execute';
import { ActionTypeRegistryContract, GetServicesFunction } from '../types';
import { TaskInstance } from '../../../task_manager';
import { EncryptedSavedObjectsPlugin } from '../../../encrypted_saved_objects';

interface CreateTaskRunnerFunctionOptions {
  getServices: GetServicesFunction;
  actionTypeRegistry: ActionTypeRegistryContract;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
}

interface TaskRunnerOptions {
  taskInstance: TaskInstance;
}

export function getCreateTaskRunnerFunction({
  getServices,
  actionTypeRegistry,
  encryptedSavedObjectsPlugin,
}: CreateTaskRunnerFunctionOptions) {
  return ({ taskInstance }: TaskRunnerOptions) => {
    return {
      run: async () => {
        const { namespace, id, actionTypeParams } = taskInstance.params;
        await execute({
          namespace,
          actionTypeRegistry,
          encryptedSavedObjectsPlugin,
          actionId: id,
          services: getServices(taskInstance.params.basePath),
          params: actionTypeParams,
        });
      },
    };
  };
}
