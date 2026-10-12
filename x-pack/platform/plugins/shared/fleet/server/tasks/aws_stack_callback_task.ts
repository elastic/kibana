/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import { CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { CloudOnboardingDeploymentSOAttributes } from '../types/so_attributes';
import { appContextService } from '../services';
import { checkAwsStackCallback } from '../services/cloud_connectors';
import { isAwsStackCallbackEnabled } from '../services/utils/iac_provisioner';

import { throwIfAborted } from './utils';

const TASK_TYPE = 'fleet:aws_stack_callback_check';
const TASK_TITLE = 'Fleet AWS stack callback check';
const TASK_TIMEOUT = '5m';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
const TASK_INTERVAL = '1m';
const DEPLOYMENTS_PER_PAGE = 100;
export const AWS_STACK_CALLBACK_TASK = '[AWS Stack Callback Task]';

export interface AwsStackCallbackCheckCounts {
  checked: number;
  failed: number;
}

export const registerAwsStackCallbackTask = (taskManager: TaskManagerSetupContract): void => {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
      createTaskRunner: ({
        signal,
      }: {
        taskInstance: ConcreteTaskInstance;
        signal: AbortSignal;
      }) => ({
        run: async () => {
          await runAwsStackCallbackTask(signal);
        },
      }),
    },
  });
};

export const scheduleAwsStackCallbackTask = async (
  taskManager: TaskManagerStartContract
): Promise<void> => {
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: { interval: TASK_INTERVAL },
      state: {},
      params: {},
    });
  } catch (error) {
    appContextService
      .getLogger()
      .error(`${AWS_STACK_CALLBACK_TASK} Error scheduling AWS stack callback task.`, { error });
  }
};

/**
 * Finishes callbacks nobody is polling for, e.g. because the user closed the tab while the stack
 * was being created: the identity is still created, and expired callbacks are marked as such.
 */
export const runAwsStackCallbackTask = async (
  signal: AbortSignal
): Promise<AwsStackCallbackCheckCounts> => {
  const logger = appContextService.getLogger().get('aws-stack-callback');
  const counts: AwsStackCallbackCheckCounts = { checked: 0, failed: 0 };

  if (!(await isAwsStackCallbackEnabled())) {
    logger.debug(`${AWS_STACK_CALLBACK_TASK} AWS stack callbacks disabled, skipping`);
    return counts;
  }

  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  // awsStackCallback is not indexed; deployments are few, so filter in memory.
  const finder = soClient.createPointInTimeFinder<CloudOnboardingDeploymentSOAttributes>({
    type: CLOUD_ONBOARDING_DEPLOYMENT_SAVED_OBJECT_TYPE,
    namespaces: ['*'],
    perPage: DEPLOYMENTS_PER_PAGE,
    fields: ['awsStackCallback'],
  });

  try {
    for await (const { saved_objects: deployments } of finder.find()) {
      for (const deployment of deployments) {
        // With `fields`, a deployment that never had a callback comes back without attributes.
        if (deployment.attributes?.awsStackCallback?.status !== 'waiting') {
          continue;
        }
        throwIfAborted(signal);
        counts.checked += 1;
        try {
          await checkAwsStackCallback(
            appContextService.getInternalUserSOClientForSpaceId(deployment.namespaces?.[0]),
            deployment.id,
            logger
          );
        } catch (error) {
          throwIfAborted(signal);
          counts.failed += 1;
          logger.warn(
            `${AWS_STACK_CALLBACK_TASK} Deployment ${deployment.id} check failed: ${error.message}`
          );
        }
      }
    }
  } catch (error) {
    if (signal.aborted) {
      logger.info(`${AWS_STACK_CALLBACK_TASK} Task was aborted`);
    } else {
      logger.error(`${AWS_STACK_CALLBACK_TASK} Task run failed: ${error.message}`);
    }
    throw error;
  } finally {
    await finder.close();
  }

  if (counts.checked > 0) {
    logger.debug(
      `${AWS_STACK_CALLBACK_TASK} Checked ${counts.checked} waiting callbacks, ${counts.failed} failed`
    );
  }
  return counts;
};
