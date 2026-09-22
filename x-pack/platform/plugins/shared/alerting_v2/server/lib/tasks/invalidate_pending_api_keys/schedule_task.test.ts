/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { scheduleApiKeyInvalidationTask } from './schedule_task';
import { INVALIDATE_API_KEYS_TASK_ID, INVALIDATE_API_KEYS_TASK_INTERVAL } from './task_definition';

describe('scheduleApiKeyInvalidationTask', () => {
  const { loggerService, mockLogger } = createLoggerService();
  const taskManager = {
    ensureScheduled: jest.fn().mockResolvedValue(undefined),
  };

  it('schedules the task as expected', async () => {
    await scheduleApiKeyInvalidationTask({
      logger: loggerService,
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
      logger: loggerService,
      taskManager: taskManager as unknown as TaskManagerStartContract,
      interval: INVALIDATE_API_KEYS_TASK_INTERVAL,
    });

    expect(mockLogger.error).toHaveBeenCalledWith('scheduling failed', {
      labels: {
        code: ALERTING_LOG_CODES.TASKS_SCHEDULE_FAILED,
        task_id: INVALIDATE_API_KEYS_TASK_ID,
      },
      error: expect.objectContaining({ message: 'scheduling failed' }),
    });
  });
});
