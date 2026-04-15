/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { scheduleApiKeyInvalidationTask } from './schedule_task';
import { INVALIDATE_API_KEYS_TASK_ID, INVALIDATE_API_KEYS_TASK_INTERVAL } from './task_definition';

describe('scheduleApiKeyInvalidationTask', () => {
  const logger = loggingSystemMock.createLogger();
  const taskManager = {
    ensureScheduled: jest.fn().mockResolvedValue(undefined),
  };

  it('schedules the task as expected', async () => {
    await scheduleApiKeyInvalidationTask({
      logger,
      taskManager: taskManager as unknown as TaskManagerStartContract,
      interval: '10m',
    });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: { interval: '10m' },
      })
    );
  });

  it('logs an error if scheduling fails', async () => {
    taskManager.ensureScheduled.mockRejectedValue(new Error('scheduling failed'));

    await scheduleApiKeyInvalidationTask({
      logger,
      taskManager: taskManager as unknown as TaskManagerStartContract,
      interval: INVALIDATE_API_KEYS_TASK_INTERVAL,
    });

    expect(logger.error).toHaveBeenCalledWith(
      `Error scheduling ${INVALIDATE_API_KEYS_TASK_ID} task, received scheduling failed`
    );
  });
});
