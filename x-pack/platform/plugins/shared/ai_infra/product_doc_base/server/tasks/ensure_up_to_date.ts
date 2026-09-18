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
import {
  isTaskCurrentlyRunningError,
  chunkedTaskStateSchemaByVersion,
  getChunkedTaskState,
  isProductName,
  runInstallChunk,
  type InstallLockManager,
} from './utils';

export const ENSURE_DOC_UP_TO_DATE_TASK_TYPE = 'ProductDocBase:EnsureUpToDate';
export const ENSURE_DOC_UP_TO_DATE_TASK_ID = 'ProductDocBase:EnsureUpToDate';
export const ENSURE_DOC_UP_TO_DATE_TASK_ID_MULTILINGUAL =
  'ProductDocBase:EnsureUpToDateMultilingual';
// Task params are immutable, so forced updates use their own task so they cannot be absorbed by an
// ordinary update that is already scheduled
export const ENSURE_DOC_UP_TO_DATE_TASK_ID_FORCED = 'ProductDocBase:EnsureUpToDateForced';
export const ENSURE_DOC_UP_TO_DATE_TASK_ID_MULTILINGUAL_FORCED =
  'ProductDocBase:EnsureUpToDateMultilingualForced';

const OPENAPI_SPEC_ITEM = 'openapi';

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
        const inferenceId = taskInstance.params?.inferenceId;
        const forceUpdate = taskInstance.params?.forceUpdate;
        return {
          async run() {
            const { packageInstaller, logger } = getServices();
            const {
              requestedAt,
              state: { remaining, attempts },
            } = getChunkedTaskState(taskInstance);
            const items = remaining ?? [
              ...(await packageInstaller.getProductsToUpdate({ inferenceId, forceUpdate })),
              OPENAPI_SPEC_ITEM,
            ];
            return runInstallChunk({
              lockManager,
              logger,
              requestedAt,
              items,
              attempts,
              // `scheduledAt` is the time of the latest update request for this task
              isSuperseded: () =>
                packageInstaller.wasUninstalledSince({
                  inferenceId,
                  since: taskInstance.scheduledAt,
                }),
              install: async (item) => {
                if (item === OPENAPI_SPEC_ITEM) {
                  await packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId, forceUpdate });
                } else if (isProductName(item)) {
                  await packageInstaller.installProduct({ productName: item, inferenceId });
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

export const getEnsureUpToDateTaskId = ({
  inferenceId,
  forceUpdate,
}: {
  inferenceId: string;
  forceUpdate?: boolean;
}): string => {
  if (isImpliedDefaultElserInferenceId(inferenceId)) {
    return forceUpdate ? ENSURE_DOC_UP_TO_DATE_TASK_ID_FORCED : ENSURE_DOC_UP_TO_DATE_TASK_ID;
  }
  return forceUpdate
    ? ENSURE_DOC_UP_TO_DATE_TASK_ID_MULTILINGUAL_FORCED
    : ENSURE_DOC_UP_TO_DATE_TASK_ID_MULTILINGUAL;
};

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
}) => {
  const taskId = getEnsureUpToDateTaskId({ inferenceId, forceUpdate });
  try {
    // `runSoon` below stamps a new `scheduledAt`, which makes an existing task drop its persisted
    // plan and start over instead of absorbing the request
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: ENSURE_DOC_UP_TO_DATE_TASK_TYPE,
      params: { inferenceId, forceUpdate },
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
