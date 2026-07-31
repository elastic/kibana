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
import { SEVERITY_TTL_GROUPS } from '../../common/notification_schema';
import { NOTIFICATION_DATA_STREAM_NAME } from '../storage/notification_data_stream';
import type { NotificationCenterPluginStart, NotificationCenterStartDependencies } from '../types';

export const CLEANUP_TASK_TYPE = 'notification-center:cleanup';
export const CLEANUP_TASK_ID = 'notification-center:cleanup';

/**
 * Builds an ES query that matches all notification docs older than their severity's TTL.
 * Uses ES date-math on the indexed `@timestamp` field so no client-side time arithmetic is needed.
 */
export const buildCleanupQuery = () => ({
  bool: {
    minimum_should_match: 1 as const,
    should: [...SEVERITY_TTL_GROUPS.entries()].map(([days, severities]) => ({
      bool: {
        filter: [
          { terms: { severity: severities } },
          { range: { '@timestamp': { lt: `now-${days}d/d` } } },
        ],
      },
    })),
  },
});

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
      cost: TaskCost.Tiny,
      createTaskRunner: ({ signal }: RunContext) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          try {
            await esClient.deleteByQuery(
              {
                index: NOTIFICATION_DATA_STREAM_NAME,
                ignore_unavailable: true,
                conflicts: 'proceed',
                refresh: false,
                query: buildCleanupQuery(),
              },
              { signal }
            );
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
