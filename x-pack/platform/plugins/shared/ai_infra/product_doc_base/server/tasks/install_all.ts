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

export const INSTALL_ALL_TASK_TYPE = 'ProductDocBase:InstallAll';
export const INSTALL_ALL_TASK_ID = 'ProductDocBase:InstallAll';
export const INSTALL_ALL_TASK_ID_MULTILINGUAL = 'ProductDocBase:InstallAllMultilingual';

export const registerInstallAllTaskDefinition = ({
  getServices,
  taskManager,
}: {
  getServices: () => InternalServices;
  taskManager: TaskManagerSetupContract;
}) => {
  taskManager.registerTaskDefinitions({
    [INSTALL_ALL_TASK_TYPE]: {
      title: `Install all product documentation artifacts ${INSTALL_ALL_TASK_TYPE}`,
      timeout: '10m',
      maxAttempts: 3,
      createTaskRunner: (context) => {
        const inferenceId = context.taskInstance?.params?.inferenceId;
        return {
          async run() {
            const { packageInstaller } = getServices();
            return packageInstaller.installAll({ inferenceId });
          },
        };
      },
      stateSchemaByVersion: {},
    },
  });
};

export const scheduleInstallAllTask = async ({
  taskManager,
  logger,
  inferenceId,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  inferenceId: string;
}) => {
  const taskId = isImpliedDefaultElserInferenceId(inferenceId)
    ? INSTALL_ALL_TASK_ID
    : INSTALL_ALL_TASK_ID_MULTILINGUAL;
  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: INSTALL_ALL_TASK_TYPE,
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
