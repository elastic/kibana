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

export const ENSURE_DOC_UP_TO_DATE_TASK_TYPE = 'ProductDocBase:EnsureUpToDate';
export const ENSURE_DOC_UP_TO_DATE_TASK_ID = 'ProductDocBase:EnsureUpToDate';

export const registerEnsureUpToDateTaskDefinition = ({
  getServices,
  taskManager,
}: {
  getServices: () => InternalServices;
  taskManager: TaskManagerSetupContract;
}) => {
  taskManager.registerTaskDefinitions({
    [ENSURE_DOC_UP_TO_DATE_TASK_TYPE]: {
      title: 'Ensure product documentation up to date task',
      timeout: '10m',
      maxAttempts: 3,
      createTaskRunner: (context) => {
        return {
          async run() {
            const { packageInstaller } = getServices();
            return packageInstaller.ensureUpToDate({});
          },
        };
      },
      stateSchemaByVersion: {},
    },
  });
};

export const scheduleEnsureUpToDateTask = async ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) => {
  try {
    await taskManager.ensureScheduled({
      id: ENSURE_DOC_UP_TO_DATE_TASK_ID,
      taskType: ENSURE_DOC_UP_TO_DATE_TASK_TYPE,
      params: {},
      state: {},
      scope: ['productDoc'],
    });

    await taskManager.runSoon(ENSURE_DOC_UP_TO_DATE_TASK_ID);

    logger.info(`Task ${ENSURE_DOC_UP_TO_DATE_TASK_ID} scheduled to run soon`);
  } catch (e) {
    if (!isTaskCurrentlyRunningError(e)) {
      throw e;
    }
  }

  return ENSURE_DOC_UP_TO_DATE_TASK_ID;
};
