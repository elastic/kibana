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
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { isImpliedDefaultElserInferenceId } from '@kbn/product-doc-common/src/is_default_inference_endpoint';
import type { InternalServices } from '../types';
import {
  anySupersededForced,
  deferForRepositoryVersion,
  findSupersededTasks,
  getInferenceScope,
  isTaskCurrentlyRunningError,
  isTaskSuperseded,
  markSupersededTasks,
  requestTaskStateSchemaByVersion,
  reviveSupersededTask,
  runTaskUnderInstallLock,
  shouldDeferForRepositoryVersion,
  type InstallLockManager,
} from './utils';

export const ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE =
  'ProductDocBase:EnsureSecurityLabsUpToDate';
export const ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID = 'ProductDocBase:EnsureSecurityLabsUpToDate';
export const ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID_MULTILINGUAL =
  'ProductDocBase:EnsureSecurityLabsUpToDateMultilingual';

interface EnsureSecurityLabsUpToDateTaskParams {
  inferenceId?: string;
  forceUpdate?: boolean;
  requestedAt?: string;
  repositoryVersion?: string;
}

export const registerEnsureSecurityLabsUpToDateTaskDefinition = ({
  getServices,
  taskManager,
  lockManager,
}: {
  getServices: () => InternalServices;
  taskManager: TaskManagerSetupContract;
  lockManager: InstallLockManager;
}) => {
  taskManager.registerTaskDefinitions({
    [ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE]: {
      title: 'Ensure Security Labs up to date task',
      timeout: '10m',
      maxAttempts: 3,
      createTaskRunner: (context) => {
        return {
          async run() {
            const params = (context.taskInstance?.params ??
              {}) as EnsureSecurityLabsUpToDateTaskParams;
            const inferenceId = params.inferenceId ?? defaultInferenceEndpoints.ELSER;
            const { forceUpdate, requestedAt, repositoryVersion } = params;
            const { packageInstaller, logger, taskManager: taskManagerStart } = getServices();
            const { id: taskId, state } = context.taskInstance;
            const superseded = async () => {
              const result = await isTaskSuperseded({ taskManager: taskManagerStart, taskId });
              if (result) {
                logger.info(
                  `Skipping Security Labs update for [${inferenceId}]: superseded by a request against a newer artifact repository version`
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
                `Deferring Security Labs update for [${inferenceId}]: requested against artifact repository version [${repositoryVersion}], newer than this node's`
              );
              return deferForRepositoryVersion(state);
            }
            return runTaskUnderInstallLock({
              lockManager,
              state,
              run: async () => {
                if (await superseded()) {
                  return;
                }
                await packageInstaller.ensureSecurityLabsUpToDate({ inferenceId, forceUpdate });
              },
              metadata: { taskType: ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE, inferenceId },
            });
          },
        };
      },
      stateSchemaByVersion: requestTaskStateSchemaByVersion,
    },
  });
};

/**
 * One update task per inference ID, repository version and force flag: `ensureScheduled` keeps it
 * idempotent without swallowing a forced request behind an ordinary one, a run in progress against
 * another version is never deleted, and tasks are one-shot so they are removed by Task Manager on
 * completion. Waiting tasks of older versions are superseded. Remote repositories keep the plain id.
 */
export const getEnsureSecurityLabsUpToDateTaskId = (
  inferenceId: string,
  repositoryVersion?: string,
  forceUpdate?: boolean
): string => {
  const baseId = isImpliedDefaultElserInferenceId(inferenceId)
    ? ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID
    : ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID_MULTILINGUAL;
  if (!repositoryVersion) {
    return baseId;
  }
  return `${baseId}:${repositoryVersion}${forceUpdate ? ':force' : ''}`;
};

export const scheduleEnsureSecurityLabsUpToDateTask = async ({
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
}) => {
  const taskType = ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE;
  const superseded = await findSupersededTasks({
    taskManager,
    taskType,
    inferenceId,
    repositoryVersion,
  });
  const effectiveForceUpdate = Boolean(forceUpdate) || anySupersededForced(superseded);
  const taskId = getEnsureSecurityLabsUpToDateTaskId(
    inferenceId,
    repositoryVersion,
    effectiveForceUpdate
  );
  const params: EnsureSecurityLabsUpToDateTaskParams = {
    inferenceId,
    forceUpdate: effectiveForceUpdate || undefined,
    requestedAt: new Date().toISOString(),
    repositoryVersion,
  };

  try {
    await reviveSupersededTask({ taskManager, logger, taskId });
    await taskManager.ensureScheduled({
      id: taskId,
      taskType,
      params,
      state: {},
      scope: ['productDoc', getInferenceScope(inferenceId)],
    });
    await markSupersededTasks({ taskManager, logger, taskType, inferenceId, tasks: superseded });

    await taskManager.runSoon(taskId);

    logger.info(`Task ${taskId} scheduled to run soon`);
  } catch (e) {
    if (!isTaskCurrentlyRunningError(e)) {
      throw e;
    }
  }

  return taskId;
};
