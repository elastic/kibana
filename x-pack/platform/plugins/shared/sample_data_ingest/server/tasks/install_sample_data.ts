/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  createTaskRunError,
  TaskErrorSource,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import type { DatasetSampleType } from '../../common';
import type { InternalServices } from '../types';
import { isTaskCurrentlyRunningError } from './utils';

export const INSTALL_SAMPLE_DATA_TASK_TYPE = 'SampleDataIngest:InstallSampleData';

export const getInstallTaskId = (sampleType: DatasetSampleType): string => {
  return `SampleDataIngest:Install:${sampleType}`;
};

export interface InstallSampleDataTaskState {
  status?: 'pending' | 'completed' | 'error';
  errorMessage?: string;
}

export const registerInstallSampleDataTaskDefinition = ({
  getServices,
  taskManager,
  core,
}: {
  getServices: () => InternalServices;
  taskManager: TaskManagerSetupContract;
  core: CoreSetup;
}) => {
  taskManager.registerTaskDefinitions({
    [INSTALL_SAMPLE_DATA_TASK_TYPE]: {
      title: `Install sample data ${INSTALL_SAMPLE_DATA_TASK_TYPE}`,
      timeout: '10m',
      maxAttempts: 3,
      createTaskRunner: ({ taskInstance, abortController }) => {
        const sampleType = taskInstance?.params?.sampleType;

        return {
          async run() {
            const { sampleDataManager } = getServices();

            if (!sampleType) {
              throw new Error('Sample type is required');
            }

            try {
              const [coreStart] = await core.getStartServices();
              const esClient = coreStart.elasticsearch.client.asInternalUser;
              const soClient = coreStart.savedObjects.createInternalRepository();
              const soImporter = coreStart.savedObjects.createImporter(soClient);

              await sampleDataManager.installSampleData({
                sampleType,
                esClient,
                soClient,
                soImporter,
                abortController,
              });

              return {
                state: { status: 'completed' },
                shouldDeleteTask: true,
              };
            } catch (error) {
              const normalizedError =
                error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));

              const taskError = createTaskRunError(normalizedError, TaskErrorSource.FRAMEWORK);

              return {
                state: {
                  status: 'error',
                  errorMessage: normalizedError.message,
                },
                error: taskError,
              };
            }
          },
        };
      },
      stateSchemaByVersion: {},
    },
  });
};

export const scheduleInstallSampleDataTask = async ({
  taskManager,
  logger,
  sampleType,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  sampleType: DatasetSampleType;
}): Promise<string> => {
  const taskId = getInstallTaskId(sampleType);

  try {
    const initialState: InstallSampleDataTaskState = { status: 'pending' };

    await taskManager.ensureScheduled({
      id: taskId,
      taskType: INSTALL_SAMPLE_DATA_TASK_TYPE,
      params: { sampleType },
      state: initialState,
      scope: ['sampleData'],
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
