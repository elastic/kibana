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
  INSTALL_TASK_TIMEOUT,
  deferForRepositoryVersion,
  getRequestTaskStatus,
  isTaskSuperseded,
  requestTaskStateSchemaByVersion,
  runTaskUnderInstallLock,
  scheduleRequestTask,
  shouldDeferForRepositoryVersion,
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
      timeout: INSTALL_TASK_TIMEOUT,
      maxAttempts: 5,
      createTaskRunner: ({ taskInstance }) => {
        const { inferenceId, requestedAt, repositoryVersion } =
          taskInstance.params as RequestTaskParams;
        const since = new Date(requestedAt);
        return {
          async run() {
            const { packageInstaller, logger, taskManager: taskManagerStart } = getServices();
            const { id: taskId, state } = taskInstance;
            const superseded = async () => {
              const result = await isTaskSuperseded({ taskManager: taskManagerStart, taskId });
              if (result) {
                logger.info(
                  `Skipping product documentation install for [${inferenceId}]: superseded by a request against a newer artifact repository version`
                );
              }
              return result;
            };
            if (await superseded()) {
              return { state };
            }
            if (
              shouldDeferForRepositoryVersion({
                requestedVersion: repositoryVersion,
                localVersion: await packageInstaller.getRepositoryVersion(),
                requestedAt,
              })
            ) {
              logger.info(
                `Deferring product documentation install for [${inferenceId}]: requested against artifact repository version [${repositoryVersion}], newer than this node's`
              );
              return deferForRepositoryVersion(state);
            }
            return runTaskUnderInstallLock({
              lockManager,
              state,
              metadata: { taskType: INSTALL_ALL_TASK_TYPE, inferenceId },
              run: async () => {
                if (await superseded()) {
                  return;
                }
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
      stateSchemaByVersion: requestTaskStateSchemaByVersion,
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
  repositoryVersion,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  inferenceId: string;
  force?: boolean;
  repositoryVersion?: string;
}): Promise<string> => {
  const params: RequestTaskParams = {
    inferenceId,
    requestedAt: new Date().toISOString(),
    repositoryVersion,
  };
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
