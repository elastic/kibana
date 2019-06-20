/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionType, Services } from '../types';
import { TaskInstance } from '../../../task_manager';
import { EncryptedSavedObjectsPlugin } from '../../../encrypted_saved_objects';
import { validateActionTypeConfig } from './validate_action_type_config';
import { validateActionTypeParams } from './validate_action_type_params';

interface CreateTaskRunnerFunctionOptions {
  getServices: (basePath: string) => Services;
  actionType: ActionType;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
}

interface TaskRunnerOptions {
  taskInstance: TaskInstance;
}

export function getCreateTaskRunnerFunction({
  getServices,
  actionType,
  encryptedSavedObjectsPlugin,
}: CreateTaskRunnerFunctionOptions) {
  return ({ taskInstance }: TaskRunnerOptions) => {
    return {
      run: async () => {
        const { namespace, id, actionTypeParams } = taskInstance.params;
        const action = await encryptedSavedObjectsPlugin.getDecryptedAsInternalUser('action', id, {
          namespace,
        });
        const mergedActionTypeConfig = {
          ...(action.attributes.actionTypeConfig || {}),
          ...(action.attributes.actionTypeConfigSecrets || {}),
        };
        const validatedActionTypeConfig = validateActionTypeConfig(
          actionType,
          mergedActionTypeConfig
        );
        const validatedActionTypeParams = validateActionTypeParams(actionType, actionTypeParams);
        await actionType.executor({
          services: getServices(taskInstance.params.basePath),
          config: validatedActionTypeConfig,
          params: validatedActionTypeParams,
        });
      },
    };
  };
}
