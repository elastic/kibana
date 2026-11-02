/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { scheduleAlertActionsCleanupTask } from './schedule_task';
import { ALERT_ACTIONS_CLEANUP_TASK_ID, ALERT_ACTIONS_CLEANUP_TASK_TYPE } from './constants';

describe('scheduleAlertActionsCleanupTask', () => {
  const { loggerService, mockLogger } = createLoggerService();
  const taskManager = {
    ensureScheduled: jest.fn(),
    removeIfExists: jest.fn(),
  };

  const run = (enabled: boolean) =>
    scheduleAlertActionsCleanupTask({
      logger: loggerService,
      taskManager: taskManager as unknown as TaskManagerStartContract,
      enabled,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    taskManager.ensureScheduled.mockResolvedValue(undefined);
    taskManager.removeIfExists.mockResolvedValue(undefined);
  });

  it('schedules a daily task when enabled', async () => {
    await run(true);

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: ALERT_ACTIONS_CLEANUP_TASK_ID,
      taskType: ALERT_ACTIONS_CLEANUP_TASK_TYPE,
      schedule: { interval: '1d' },
      state: {},
      params: {},
    });
    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
  });

  it('removes the task and does not schedule it when disabled', async () => {
    await run(false);

    expect(taskManager.removeIfExists).toHaveBeenCalledWith(ALERT_ACTIONS_CLEANUP_TASK_ID);
    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
  });

  it('logs an error if scheduling fails', async () => {
    taskManager.ensureScheduled.mockRejectedValue(new Error('scheduling failed'));

    await run(true);

    expect(mockLogger.error).toHaveBeenCalledWith('scheduling failed', {
      labels: {
        code: ALERTING_LOG_CODES.TASKS_SCHEDULE_FAILED,
        task_id: ALERT_ACTIONS_CLEANUP_TASK_ID,
      },
      error: expect.objectContaining({ message: 'scheduling failed' }),
    });
  });

  it('logs an error if removing the task fails', async () => {
    taskManager.removeIfExists.mockRejectedValue(new Error('remove failed'));

    await run(false);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'remove failed',
      expect.objectContaining({
        labels: expect.objectContaining({ task_id: ALERT_ACTIONS_CLEANUP_TASK_ID }),
      })
    );
  });
});
