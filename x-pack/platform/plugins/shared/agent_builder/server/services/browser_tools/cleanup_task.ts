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
import { taskTypes } from '../execution/task/task_definitions';
import type { BrowserToolCallClient } from './persistence';

const taskType = taskTypes.browserToolCallsCleanup;
const MAX_AGE_HOURS = 1;

export const registerBrowserToolCallsCleanupTask = ({
  taskManager,
  getCallClient,
  logger,
}: {
  taskManager: TaskManagerSetupContract;
  getCallClient: () => BrowserToolCallClient;
  logger: Logger;
}): void => {
  taskManager.registerTaskDefinitions({
    [taskType]: {
      title: 'Agent Builder: browser tool calls cleanup',
      timeout: '5m',
      maxAttempts: 1,
      createTaskRunner: () => ({
        run: async () => {
          try {
            const deleted = await getCallClient().deleteOlderThan({ hours: MAX_AGE_HOURS });
            logger.debug(`Deleted ${deleted} expired browser tool call documents`);
          } catch (error) {
            logger.warn(`Browser tool calls cleanup failed: ${(error as Error).message}`);
          }
          return { state: {} };
        },
        cancel: async () => {},
      }),
    },
  });
};

export const ensureBrowserToolCallsCleanupScheduled = async ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}): Promise<void> => {
  try {
    await taskManager.ensureScheduled({
      id: taskType,
      taskType,
      schedule: { interval: '1h' },
      params: {},
      state: {},
    });
  } catch (error) {
    logger.warn(`Failed to schedule browser tool calls cleanup: ${(error as Error).message}`);
  }
};
