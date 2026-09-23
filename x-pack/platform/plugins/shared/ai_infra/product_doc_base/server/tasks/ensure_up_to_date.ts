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
import { ResourceTypes } from '@kbn/product-doc-common';
import type { InternalServices } from '../types';
import {
  INSTALL_TASK_TIMEOUT,
  runTaskUnderInstallLock,
  scheduleRequestTask,
  type InstallLockManager,
  type RequestTaskParams,
} from './utils';

export const ENSURE_DOC_UP_TO_DATE_TASK_TYPE = 'ProductDocBase:EnsureUpToDate';

interface EnsureUpToDateTaskParams extends RequestTaskParams {
  forceUpdate?: boolean;
}

export const registerEnsureUpToDateTaskDefinition = ({
  getServices,
  taskManager,
  lockManager,
}: {
  getServices: () => InternalServices;
  taskManager: TaskManagerSetupContract;
  lockManager: InstallLockManager;
}) => {
  taskManager.registerTaskDefinitions({
    [ENSURE_DOC_UP_TO_DATE_TASK_TYPE]: {
      title: 'Ensure product documentation up to date task',
      timeout: INSTALL_TASK_TIMEOUT,
      maxAttempts: 5,
      createTaskRunner: ({ taskInstance }) => {
        const { inferenceId, forceUpdate, requestedAt } =
          taskInstance.params as EnsureUpToDateTaskParams;
        const since = new Date(requestedAt);
        return {
          async run() {
            const { packageInstaller, logger } = getServices();
            return runTaskUnderInstallLock({
              lockManager,
              metadata: { taskType: ENSURE_DOC_UP_TO_DATE_TASK_TYPE, inferenceId },
              run: async () => {
                const superseded = async (
                  resourceType: typeof ResourceTypes.productDoc | typeof ResourceTypes.openapiSpec
                ) => {
                  const result = await packageInstaller.wasUninstalledSince({
                    inferenceId,
                    since,
                    resourceType,
                  });
                  if (result) {
                    logger.info(
                      `Stopping product documentation update for [${inferenceId}]: superseded by a later uninstall of ${resourceType}`
                    );
                  }
                  return result;
                };
                for (const productName of await packageInstaller.getProductsToUpdate({
                  inferenceId,
                  forceUpdate,
                })) {
                  if (await superseded(ResourceTypes.productDoc)) {
                    return;
                  }
                  // Re-checked under the lock so concurrent update tasks do not install it twice
                  await packageInstaller.updateProductIfNeeded({
                    productName,
                    inferenceId,
                    forceUpdate,
                    since,
                  });
                }
                if (await superseded(ResourceTypes.openapiSpec)) {
                  return;
                }
                await packageInstaller.ensureOpenApiSpecUpToDate({
                  inferenceId,
                  forceUpdate,
                  since,
                });
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
 * Schedules an update task for this request. A pending update with the same `forceUpdate` for the
 * inference ID is reused, so e.g. every node's startup does not queue its own update.
 */
export const scheduleEnsureUpToDateTask = ({
  taskManager,
  logger,
  inferenceId,
  forceUpdate,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  inferenceId: string;
  forceUpdate?: boolean;
}): Promise<string> => {
  const params: EnsureUpToDateTaskParams = {
    inferenceId,
    forceUpdate,
    requestedAt: new Date().toISOString(),
  };
  return scheduleRequestTask({
    taskManager,
    logger,
    taskType: ENSURE_DOC_UP_TO_DATE_TASK_TYPE,
    params,
    reusePending: true,
    matches: (task) => Boolean(task.params.forceUpdate) === Boolean(forceUpdate),
  });
};
