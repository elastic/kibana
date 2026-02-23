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
import { isTaskCurrentlyRunningError } from './utils';

export const ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE =
  'ProductDocBase:EnsureSecurityLabsUpToDate';
export const ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID = 'ProductDocBase:EnsureSecurityLabsUpToDate';
export const ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID_MULTILINGUAL =
  'ProductDocBase:EnsureSecurityLabsUpToDateMultilingual';

export const registerEnsureSecurityLabsUpToDateTaskDefinition = ({
  getServices,
  taskManager,
}: {
  getServices: () => InternalServices;
  taskManager: TaskManagerSetupContract;
}) => {
  taskManager.registerTaskDefinitions({
    [ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE]: {
      title: 'Ensure Security Labs up to date task',
      timeout: '10m',
      maxAttempts: 3,
      createTaskRunner: (context) => {
        return {
          async run() {
            const inferenceId =
              context.taskInstance?.params?.inferenceId ?? defaultInferenceEndpoints.ELSER;
            const forceUpdate = context.taskInstance?.params?.forceUpdate;
            const { packageInstaller } = getServices();
            return packageInstaller.ensureSecurityLabsUpToDate({ inferenceId, forceUpdate });
          },
        };
      },
      stateSchemaByVersion: {},
    },
  });
};

export const scheduleEnsureSecurityLabsUpToDateTask = async ({
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
  const taskId = isImpliedDefaultElserInferenceId(inferenceId)
    ? ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID
    : ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_ID_MULTILINGUAL;

  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: ENSURE_SECURITY_LABS_UP_TO_DATE_TASK_TYPE,
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
