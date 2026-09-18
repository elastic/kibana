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
import { DocumentationProduct, ResourceTypes } from '@kbn/product-doc-common';
import type { InternalServices } from '../types';
import {
  chunkedTaskStateSchemaByVersion,
  getInferenceScope,
  isProductName,
  isTaskPending,
  runInstallChunk,
  type ChunkedTaskState,
  type InstallLockManager,
  type RequestTaskParams,
} from './utils';

export const INSTALL_ALL_TASK_TYPE = 'ProductDocBase:InstallAll';

export const registerInstallAllTaskDefinition = ({
  getServices,
  taskManager,
  lockManager,
}: {
  getServices: () => InternalServices;
  taskManager: TaskManagerSetupContract;
  lockManager: InstallLockManager;
}) => {
  taskManager.registerTaskDefinitions({
    [INSTALL_ALL_TASK_TYPE]: {
      title: `Install all product documentation artifacts ${INSTALL_ALL_TASK_TYPE}`,
      timeout: '10m',
      maxAttempts: 3,
      createTaskRunner: ({ taskInstance }) => {
        const { inferenceId, requestedAt } = taskInstance.params as RequestTaskParams;
        return {
          async run() {
            const { remaining, attempts } = taskInstance.state as ChunkedTaskState;
            const { packageInstaller, logger } = getServices();
            return runInstallChunk({
              lockManager,
              logger,
              items: (remaining ?? Object.values(DocumentationProduct)).filter(isProductName),
              attempts,
              install: (productName) =>
                packageInstaller.installProduct({ productName, inferenceId }),
              // Only a product documentation uninstall supersedes this task, not an OpenAPI-only one
              isSuperseded: () =>
                packageInstaller.wasUninstalledSince({
                  inferenceId,
                  since: new Date(requestedAt),
                  resourceType: ResourceTypes.productDoc,
                }),
              metadata: { taskType: INSTALL_ALL_TASK_TYPE, inferenceId },
            });
          },
        };
      },
      stateSchemaByVersion: chunkedTaskStateSchemaByVersion,
    },
  });
};

/**
 * Schedules a new install task for this request. Every request gets its own task instance, so a
 * request can neither be absorbed by an earlier task's persisted plan nor lose its request time.
 */
export const scheduleInstallAllTask = async ({
  taskManager,
  logger,
  inferenceId,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  inferenceId: string;
}): Promise<string> => {
  const params: RequestTaskParams = { inferenceId, requestedAt: new Date().toISOString() };
  const { id } = await taskManager.schedule({
    taskType: INSTALL_ALL_TASK_TYPE,
    params,
    state: {},
    scope: ['productDoc', getInferenceScope(inferenceId)],
  });
  logger.info(`Task ${id} scheduled to install product documentation for [${inferenceId}]`);
  return id;
};

export const isInstallAllTaskPending = ({
  taskManager,
  inferenceId,
}: {
  taskManager: TaskManagerStartContract;
  inferenceId: string;
}): Promise<boolean> =>
  isTaskPending({ taskManager, taskType: INSTALL_ALL_TASK_TYPE, inferenceId });
