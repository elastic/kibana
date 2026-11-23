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
  anySupersededForced,
  deferForRepositoryVersion,
  isStaleRepositoryRequest,
  isTaskSuperseded,
  requestTaskStateSchemaByVersion,
  runTaskUnderInstallLock,
  scheduleRequestTask,
  shouldDeferForRepositoryVersion,
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
        const { inferenceId, forceUpdate, requestedAt, repositoryVersion } =
          taskInstance.params as EnsureUpToDateTaskParams;
        const since = new Date(requestedAt);
        return {
          async run() {
            const { packageInstaller, logger, taskManager: taskManagerStart } = getServices();
            const { id: taskId, state } = taskInstance;
            const superseded = async () => {
              const result = await isTaskSuperseded({ taskManager: taskManagerStart, taskId });
              if (result) {
                logger.info(
                  `Skipping product documentation update for [${inferenceId}]: superseded by a request against a newer artifact repository version`
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
                `Deferring product documentation update for [${inferenceId}]: requested against artifact repository version [${repositoryVersion}], newer than this node's`
              );
              return deferForRepositoryVersion(state);
            }
            return runTaskUnderInstallLock({
              lockManager,
              state,
              metadata: { taskType: ENSURE_DOC_UP_TO_DATE_TASK_TYPE, inferenceId },
              run: async () => {
                // Re-checked under the lock: a newer request may have completed or superseded this
                // one while it waited, and forced updates are the documented repair path
                if (await superseded()) {
                  return;
                }
                if (
                  !forceUpdate &&
                  isStaleRepositoryRequest({
                    requestedVersion: repositoryVersion,
                    installedVersion: await packageInstaller.getInstalledRepositoryVersion({
                      inferenceId,
                    }),
                  })
                ) {
                  logger.info(
                    `Skipping product documentation update for [${inferenceId}]: requested against artifact repository version [${repositoryVersion}], older than the installed one`
                  );
                  return;
                }
                const uninstalledSince = async (
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
                  if (await uninstalledSince(ResourceTypes.productDoc)) {
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
                if (await uninstalledSince(ResourceTypes.openapiSpec)) {
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
      stateSchemaByVersion: requestTaskStateSchemaByVersion,
    },
  });
};

/**
 * Schedules an update task for this request. A pending update with the same `forceUpdate` and
 * repository version for the inference ID is reused, so e.g. every node's startup does not queue its
 * own update. A forced update superseded by this request is carried over, so a requested repair
 * still runs.
 */
export const scheduleEnsureUpToDateTask = ({
  taskManager,
  logger,
  inferenceId,
  forceUpdate,
  repositoryVersion,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  inferenceId: string;
  forceUpdate?: boolean;
  repositoryVersion?: string;
}): Promise<string> => {
  const params: EnsureUpToDateTaskParams = {
    inferenceId,
    forceUpdate,
    requestedAt: new Date().toISOString(),
    repositoryVersion,
  };
  return scheduleRequestTask({
    taskManager,
    logger,
    taskType: ENSURE_DOC_UP_TO_DATE_TASK_TYPE,
    params,
    reusePending: true,
    matches: (task) => Boolean(task.params.forceUpdate) === Boolean(forceUpdate),
    mergeSuperseded: (requestParams, superseded) =>
      anySupersededForced(superseded) ? { ...requestParams, forceUpdate: true } : requestParams,
  });
};
