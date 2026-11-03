/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { taskTypes } from '../execution/task/task_definitions';
import {
  ensureBrowserToolCallsCleanupScheduled,
  registerBrowserToolCallsCleanupTask,
} from './cleanup_task';

describe('browser tool calls cleanup task', () => {
  const logger = loggingSystemMock.createLogger();
  const getRunner = (deleteOlderThan: jest.Mock) => {
    const taskManager = taskManagerMock.createSetup();
    registerBrowserToolCallsCleanupTask({
      taskManager,
      logger,
      getCallClient: () => ({ deleteOlderThan } as any),
    });
    const definitions = (taskManager.registerTaskDefinitions as jest.Mock).mock.calls[0][0];
    return definitions[taskTypes.browserToolCallsCleanup].createTaskRunner({
      taskInstance: {},
    });
  };

  it('task runner deletes documents older than one hour', async () => {
    const deleteOlderThan = jest.fn().mockResolvedValue(3);
    const result = await getRunner(deleteOlderThan).run();
    expect(deleteOlderThan).toHaveBeenCalledWith({ hours: 1 });
    expect(result).toEqual({ state: {} });
  });

  it('does not throw when deletion fails', async () => {
    const deleteOlderThan = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(getRunner(deleteOlderThan).run()).resolves.toEqual({ state: {} });
  });

  it('schedules the task idempotently every hour', async () => {
    const taskManager = taskManagerMock.createStart();
    await ensureBrowserToolCallsCleanupScheduled({ taskManager, logger });
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: taskTypes.browserToolCallsCleanup,
      taskType: taskTypes.browserToolCallsCleanup,
      schedule: { interval: '1h' },
      params: {},
      state: {},
    });
  });
});
