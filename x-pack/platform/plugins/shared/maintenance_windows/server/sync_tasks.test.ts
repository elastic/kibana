/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { TaskAlreadyRunningError } from '@kbn/task-manager-plugin/server';
import { MaintenanceWindowSyncTasks } from './sync_tasks';

const flushSchedule = () => new Promise((resolve) => setImmediate(resolve));

describe('MaintenanceWindowSyncTasks', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers task ids and runs them soon', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon.mockResolvedValue({} as any);
    syncTasks.setTaskManager(taskManager);

    const unsubscribe = syncTasks.register('my-sync-task');
    syncTasks.runSoon();

    await flushSchedule();
    expect(taskManager.runSoon).toHaveBeenCalledWith('my-sync-task');

    unsubscribe();
    taskManager.runSoon.mockClear();
    syncTasks.runSoon();
    await flushSchedule();
    expect(taskManager.runSoon).not.toHaveBeenCalled();
  });

  it('keeps the task registered until every registration for it is unsubscribed', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon.mockResolvedValue({} as any);
    syncTasks.setTaskManager(taskManager);

    const unsubscribeFirst = syncTasks.register('shared-task');
    const unsubscribeSecond = syncTasks.register('shared-task');

    unsubscribeFirst();
    syncTasks.runSoon();
    await flushSchedule();
    expect(taskManager.runSoon).toHaveBeenCalledWith('shared-task');

    taskManager.runSoon.mockClear();
    unsubscribeSecond();
    syncTasks.runSoon();
    await flushSchedule();
    expect(taskManager.runSoon).not.toHaveBeenCalled();
  });

  it('is safe to call the same unsubscribe function more than once', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon.mockResolvedValue({} as any);
    syncTasks.setTaskManager(taskManager);

    const unsubscribeFirst = syncTasks.register('shared-task');
    syncTasks.register('shared-task');

    unsubscribeFirst();
    unsubscribeFirst();

    syncTasks.runSoon();
    await flushSchedule();
    expect(taskManager.runSoon).toHaveBeenCalledWith('shared-task');
  });

  it('logs an error and continues when runSoon fails with an unexpected error', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon
      .mockRejectedValueOnce(new Error('missing'))
      .mockResolvedValueOnce({} as any);
    syncTasks.setTaskManager(taskManager);

    syncTasks.register('bad-task');
    syncTasks.register('good-task');
    syncTasks.runSoon();

    await flushSchedule();

    expect(taskManager.runSoon).toHaveBeenCalledWith('bad-task');
    expect(taskManager.runSoon).toHaveBeenCalledWith('good-task');
    expect(taskManager.runSoon).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('logs at debug and does not retry when the task is already running', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon.mockRejectedValue(new TaskAlreadyRunningError('my-sync-task'));
    syncTasks.setTaskManager(taskManager);

    syncTasks.register('my-sync-task');
    syncTasks.runSoon();

    await flushSchedule();

    expect(taskManager.runSoon).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('already running'));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('no-ops when task manager is unset or no tasks registered', () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    expect(() => syncTasks.runSoon()).not.toThrow();

    const taskManager = taskManagerMock.createStart();
    syncTasks.setTaskManager(taskManager);
    syncTasks.runSoon();
    expect(taskManager.runSoon).not.toHaveBeenCalled();
  });
});
