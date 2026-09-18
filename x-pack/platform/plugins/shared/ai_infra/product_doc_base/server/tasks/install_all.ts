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
import { DocumentationProduct, ResourceTypes, type ProductName } from '@kbn/product-doc-common';
import type { InternalServices } from '../types';
import {
  getRequestTaskStatus,
  runTaskUnderInstallLock,
  scheduleRequestTask,
  type InstallLockManager,
  type RequestTaskParams,
  type RequestTaskStatus,
} from './utils';

export const INSTALL_ALL_TASK_TYPE = 'ProductDocBase:InstallAll';

const allProducts = Object.values(DocumentationProduct) as ProductName[];

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
      timeout: '20m',
      maxAttempts: 5,
      createTaskRunner: ({ taskInstance }) => {
        const { inferenceId, requestedAt } = taskInstance.params as RequestTaskParams;
        const since = new Date(requestedAt);
        return {
          async run() {
            const { packageInstaller, logger } = getServices();
            return runTaskUnderInstallLock({
              lockManager,
              metadata: { taskType: INSTALL_ALL_TASK_TYPE, inferenceId },
              run: async () => {
                for (const productName of allProducts) {
                  // An uninstall requested after this install wins; OpenAPI-only uninstalls do not count
                  if (
                    await packageInstaller.wasUninstalledSince({
                      inferenceId,
                      since,
                      resourceType: ResourceTypes.productDoc,
                    })
                  ) {
                    logger.info(
                      `Stopping product documentation install for [${inferenceId}]: superseded by a later uninstall`
                    );
                    return;
                  }
                  // Products another task installed after this request, or a retry already did, are skipped
                  await packageInstaller.installProductIfNeeded({
                    productName,
                    inferenceId,
                    since,
                  });
                }
              },
            });
          },
        };
      },
      stateSchemaByVersion: {},
    },
  });
};

/**
 * Schedules an install task for this request. A pending install for the same inference ID is reused
 * unless the request is forced, so overlapping requests do not install everything twice.
 */
export const scheduleInstallAllTask = ({
  taskManager,
  logger,
  inferenceId,
  force = false,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  inferenceId: string;
  force?: boolean;
}): Promise<string> => {
  const params: RequestTaskParams = { inferenceId, requestedAt: new Date().toISOString() };
  return scheduleRequestTask({
    taskManager,
    logger,
    taskType: INSTALL_ALL_TASK_TYPE,
    params,
    reusePending: !force,
  });
};

export const getInstallAllTaskStatus = ({
  taskManager,
  inferenceId,
}: {
  taskManager: TaskManagerStartContract;
  inferenceId: string;
}): Promise<RequestTaskStatus> =>
  getRequestTaskStatus({ taskManager, taskType: INSTALL_ALL_TASK_TYPE, inferenceId });
