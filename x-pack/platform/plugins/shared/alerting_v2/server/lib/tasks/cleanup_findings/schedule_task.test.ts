/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { scheduleCleanupFindingsTask } from './schedule_task';
import {
  CLEANUP_FINDINGS_TASK_ID,
  CLEANUP_FINDINGS_TASK_TYPE,
  CLEANUP_FINDINGS_TASK_INTERVAL,
} from './task_definition';
import { emptyState } from './task_state';

describe('scheduleCleanupFindingsTask', () => {
  const logger = loggingSystemMock.createLogger();
  const taskManager = {
    ensureScheduled: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules the task with correct parameters', async () => {
    await scheduleCleanupFindingsTask({
      logger,
      taskManager: taskManager as unknown as TaskManagerStartContract,
    });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: CLEANUP_FINDINGS_TASK_ID,
      taskType: CLEANUP_FINDINGS_TASK_TYPE,
      schedule: { interval: CLEANUP_FINDINGS_TASK_INTERVAL },
      state: emptyState,
      params: {},
    });
  });

  it('logs an error if scheduling fails', async () => {
    taskManager.ensureScheduled.mockRejectedValue(new Error('scheduling failed'));

    await scheduleCleanupFindingsTask({
      logger,
      taskManager: taskManager as unknown as TaskManagerStartContract,
    });

    expect(logger.error).toHaveBeenCalledWith(
      `Error scheduling ${CLEANUP_FINDINGS_TASK_ID} task, received scheduling failed`
    );
  });
});
