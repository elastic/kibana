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
  chunkedTaskStateSchemaByVersion,
  getInferenceScope,
  isProductName,
  runInstallChunk,
  type ChunkedTaskState,
  type InstallLockManager,
  type RequestTaskParams,
} from './utils';

export const ENSURE_DOC_UP_TO_DATE_TASK_TYPE = 'ProductDocBase:EnsureUpToDate';

const OPENAPI_SPEC_ITEM = 'openapi';

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
      timeout: '10m',
      maxAttempts: 3,
      createTaskRunner: ({ taskInstance }) => {
        const { inferenceId, forceUpdate, requestedAt } =
          taskInstance.params as EnsureUpToDateTaskParams;
        const since = new Date(requestedAt);
        return {
          async run() {
            const { packageInstaller, logger } = getServices();
            const { remaining, attempts } = taskInstance.state as ChunkedTaskState;
            const items = remaining ?? [
              ...(await packageInstaller.getProductsToUpdate({ inferenceId, forceUpdate })),
              OPENAPI_SPEC_ITEM,
            ];
            return runInstallChunk({
              lockManager,
              logger,
              items,
              attempts,
              // An item is superseded by a later uninstall of its own resource only
              isSuperseded: (item) =>
                packageInstaller.wasUninstalledSince({
                  inferenceId,
                  since,
                  resourceType:
                    item === OPENAPI_SPEC_ITEM
                      ? ResourceTypes.openapiSpec
                      : ResourceTypes.productDoc,
                }),
              // Each item re-checks under the lock whether it still needs updating, so concurrent
              // update tasks for the same inference ID do not install it twice
              install: async (item) => {
                if (item === OPENAPI_SPEC_ITEM) {
                  await packageInstaller.ensureOpenApiSpecUpToDate({
                    inferenceId,
                    forceUpdate,
                    since,
                  });
                } else if (isProductName(item)) {
                  await packageInstaller.updateProductIfNeeded({
                    productName: item,
                    inferenceId,
                    forceUpdate,
                    since,
                  });
                }
              },
              metadata: { taskType: ENSURE_DOC_UP_TO_DATE_TASK_TYPE, inferenceId },
            });
          },
        };
      },
      stateSchemaByVersion: chunkedTaskStateSchemaByVersion,
    },
  });
};

/**
 * Schedules a new update task for this request. Every request gets its own task instance with its
 * own params, so a forced update cannot be absorbed by an ordinary one that is still running.
 */
export const scheduleEnsureUpToDateTask = async ({
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
  const { id } = await taskManager.schedule({
    taskType: ENSURE_DOC_UP_TO_DATE_TASK_TYPE,
    params,
    state: {},
    scope: ['productDoc', getInferenceScope(inferenceId)],
  });
  logger.info(`Task ${id} scheduled to update product documentation for [${inferenceId}]`);
  return id;
};
