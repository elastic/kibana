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
import type { InternalServices } from '../types';
import { isTaskCurrentlyRunningError } from './utils';

export const INSTALL_ALL_TASK_TYPE = 'ProductDocBase:InstallAll';
export const INSTALL_ALL_TASK_ID = 'ProductDocBase:InstallAll';

export const registerInstallAllTaskDefinition = ({
  getServices,
  taskManager,
}: {
  getServices: () => InternalServices;
  taskManager: TaskManagerSetupContract;
}) => {
  taskManager.registerTaskDefinitions({
    [INSTALL_ALL_TASK_TYPE]: {
      title: 'Install all product documentation artifacts',
      timeout: '10m',
      maxAttempts: 3,
      createTaskRunner: (context) => {
        return {
          async run() {
            const { packageInstaller } = getServices();
            return packageInstaller.installAll({});
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
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) => {
  try {
    await taskManager.ensureScheduled({
      id: INSTALL_ALL_TASK_ID,
      taskType: INSTALL_ALL_TASK_TYPE,
      params: {},
      state: {},
      scope: ['productDoc'],
    });

    await taskManager.runSoon(INSTALL_ALL_TASK_ID);

    logger.info(`Task ${INSTALL_ALL_TASK_ID} scheduled to run soon`);
  } catch (e) {
    if (!isTaskCurrentlyRunningError(e)) {
      throw e;
    }
  }

  return INSTALL_ALL_TASK_ID;
};
