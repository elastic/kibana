/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { MaintenanceWindowSyncTasks } from './sync_tasks';

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

    expect(taskManager.runSoon).toHaveBeenCalledWith('my-sync-task');

    unsubscribe();
    taskManager.runSoon.mockClear();
    syncTasks.runSoon();
    expect(taskManager.runSoon).not.toHaveBeenCalled();
  });

  it('logs and continues when runSoon fails', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon
      .mockRejectedValueOnce(new Error('missing'))
      .mockResolvedValueOnce({} as any);
    syncTasks.setTaskManager(taskManager);

    syncTasks.register('bad-task');
    syncTasks.register('good-task');
    syncTasks.runSoon();

    await new Promise((resolve) => setImmediate(resolve));

    expect(taskManager.runSoon).toHaveBeenCalledWith('bad-task');
    expect(taskManager.runSoon).toHaveBeenCalledWith('good-task');
    expect(logger.error).toHaveBeenCalled();
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
