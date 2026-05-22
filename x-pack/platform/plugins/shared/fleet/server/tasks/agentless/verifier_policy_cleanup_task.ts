/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import { appContextService } from '../../services';

import { runVerifierPolicyCleanup } from './verifier_policy_cleanup';

const TASK_TYPE = 'fleet:verifier_policy_cleanup';
const TASK_TITLE = 'OTel Permission Verifier Cleanup Task';
const TASK_TIMEOUT = '30m';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
/** Runs more often than verify_permissions (12h) so TTL-expired verifiers are removed promptly. */
const TASK_INTERVAL = '5m';

export const CLEANUP_TASK_LOG = '[OTel Permission Verifier Cleanup Task]';

export function registerVerifierPolicyCleanupTask(taskManager: TaskManagerSetupContract) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
      createTaskRunner: ({ abortController }) => ({
        run: async () => {
          const logger = appContextService.getLogger().get('otel-verifier');
          logger.debug(`${CLEANUP_TASK_LOG} Task run started`);
          try {
            await runVerifierPolicyCleanup(abortController);
          } catch (error) {
            logger.error(`${CLEANUP_TASK_LOG} Error running cleanup task.`, { error });
            throw error;
          }
          logger.debug(`${CLEANUP_TASK_LOG} Task run completed`);
        },
      }),
    },
  });
}

export async function scheduleVerifierPolicyCleanupTask(taskManager: TaskManagerStartContract) {
  const logger = appContextService.getLogger().get('otel-verifier');
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: {
        interval: TASK_INTERVAL,
      },
      state: {},
      params: {},
    });
    logger.debug(
      `${CLEANUP_TASK_LOG} Scheduled recurring task (id=${TASK_ID}, interval=${TASK_INTERVAL})`
    );
  } catch (error) {
    logger.error(`${CLEANUP_TASK_LOG} Error scheduling cleanup task.`, {
      error,
    });
  }
}
