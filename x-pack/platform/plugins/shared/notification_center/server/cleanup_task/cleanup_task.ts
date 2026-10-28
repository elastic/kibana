/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import type { NotificationCenterPluginStart, NotificationCenterStartDependencies } from '../types';
import { cleanupExpiredNotifications } from './cleanup_expired_notifications';

export const CLEANUP_TASK_TYPE = 'notification-center:cleanup';
export const CLEANUP_TASK_ID = 'notification-center:cleanup';

export const registerNotificationCleanupTask = (
  core: CoreSetup<NotificationCenterStartDependencies, NotificationCenterPluginStart>,
  taskManager: TaskManagerSetupContract,
  logger: Logger
): void => {
  taskManager.registerTaskDefinitions({
    [CLEANUP_TASK_TYPE]: {
      title: 'Notification Center retention cleanup',
      // First run may scan up to 180d of data; 10m gives headroom without tying up TM slots.
      timeout: '10m',
      // Composite aggregation plus batched deletion is a normal-cost ES workload.
      cost: TaskCost.Normal,
      createTaskRunner: ({ signal }: RunContext) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          try {
            await cleanupExpiredNotifications(esClient, signal);
          } catch (err) {
            logger.error(`Notification Center cleanup task failed: ${err.message}`);
          }
        },
      }),
    },
  });
};

export const scheduleNotificationCleanupTask = (taskManager: TaskManagerStartContract) =>
  taskManager.ensureScheduled({
    id: CLEANUP_TASK_ID,
    taskType: CLEANUP_TASK_TYPE,
    schedule: { interval: '1d' },
    state: {},
    params: {},
  });
