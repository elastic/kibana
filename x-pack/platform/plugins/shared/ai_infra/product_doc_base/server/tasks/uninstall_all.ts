/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { isImpliedDefaultElserInferenceId } from '@kbn/product-doc-common/src/is_default_inference_endpoint';
import type { InternalServices } from '../types';
import { isTaskCurrentlyRunningError } from './utils';

export const UNINSTALL_ALL_TASK_TYPE = 'ProductDocBase:UninstallAll';
export const UNINSTALL_ALL_TASK_ID = 'ProductDocBase:UninstallAll';
export const UNINSTALL_ALL_TASK_ID_MULTILINGUAL = 'ProductDocBase:UninstallAllMultilingual';

export const registerUninstallAllTaskDefinition = ({
  getServices,
  taskManager,
}: {
  getServices: () => InternalServices;
  taskManager: TaskManagerSetupContract;
}) => {
  taskManager.registerTaskDefinitions({
    [UNINSTALL_ALL_TASK_TYPE]: {
      title: `Uninstall all product documentation artifacts ${UNINSTALL_ALL_TASK_TYPE}`,
      timeout: '10m',
      maxAttempts: 3,
      createTaskRunner: (context) => {
        return {
          async run() {
            const { packageInstaller } = getServices();
            return packageInstaller.uninstallAll({
              inferenceId: context.taskInstance?.params?.inferenceId,
            });
          },
        };
      },
      stateSchemaByVersion: {},
    },
  });
};

export const scheduleUninstallAllTask = async ({
  taskManager,
  logger,
  inferenceId,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  inferenceId: string;
}) => {
  // To avoid conflicts between the default ELSER model and small E5 inference IDs running at the same time,
  // we use different task IDs for each inference ID.
  const taskId = isImpliedDefaultElserInferenceId(inferenceId)
    ? UNINSTALL_ALL_TASK_ID
    : UNINSTALL_ALL_TASK_ID_MULTILINGUAL;

  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: UNINSTALL_ALL_TASK_TYPE,
      params: { inferenceId },
      state: {},
      scope: ['productDoc'],
    });

    await taskManager.runSoon(taskId);

    logger.info(`Task ${taskId} scheduled to run soon`);
  } catch (e) {
    if (!isTaskCurrentlyRunningError(e)) {
      throw e;
    }
  }

  return taskId;
};
