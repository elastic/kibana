/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { MaintenanceWindowSyncTasks } from './sync_tasks';

type PRetryInput = Parameters<typeof pRetry>[0];
type PRetryOptions = Parameters<typeof pRetry>[1];

// Use 0ms delays so retry tests run synchronously without fake timers.
jest.mock('p-retry', () => {
  const actual = jest.requireActual('p-retry') as {
    default: typeof pRetry;
    AbortError: typeof pRetry.AbortError;
  };
  const mockFn = Object.assign(
    jest.fn((fn: PRetryInput, options?: PRetryOptions) =>
      actual.default(fn, { ...options, minTimeout: 0, maxTimeout: 0, randomize: false })
    ),
    { AbortError: actual.AbortError }
  );
  return { __esModule: true, default: mockFn, AbortError: actual.AbortError };
});

const currentlyRunningError = (taskId: string): Error =>
  new Error(`Failed to run task "${taskId}" as it is currently running`);

const runSoonResult = (id: string): { id: string } => ({ id });

const flushRetries = async (iterations = 6): Promise<void> => {
  for (let i = 0; i < iterations; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe('MaintenanceWindowSyncTasks', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(pRetry).mockClear();
  });

  it('registers task ids and runs them soon', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon.mockResolvedValue(runSoonResult('my-sync-task'));
    syncTasks.setTaskManager(taskManager);

    const unsubscribe = syncTasks.register('my-sync-task');
    syncTasks.runSoon();

    expect(taskManager.runSoon).toHaveBeenCalledWith('my-sync-task');

    unsubscribe();
    taskManager.runSoon.mockClear();
    syncTasks.runSoon();
    expect(taskManager.runSoon).not.toHaveBeenCalled();
  });

  it('keeps the task registered until every registration for it is unsubscribed', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon.mockResolvedValue(runSoonResult('shared-task'));
    syncTasks.setTaskManager(taskManager);

    const unsubscribeFirst = syncTasks.register('shared-task');
    const unsubscribeSecond = syncTasks.register('shared-task');

    unsubscribeFirst();
    syncTasks.runSoon();
    expect(taskManager.runSoon).toHaveBeenCalledWith('shared-task');

    taskManager.runSoon.mockClear();
    unsubscribeSecond();
    syncTasks.runSoon();
    expect(taskManager.runSoon).not.toHaveBeenCalled();
  });

  it('is safe to call the same unsubscribe function more than once', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon.mockResolvedValue(runSoonResult('shared-task'));
    syncTasks.setTaskManager(taskManager);

    const unsubscribeFirst = syncTasks.register('shared-task');
    syncTasks.register('shared-task');

    unsubscribeFirst();
    unsubscribeFirst();

    syncTasks.runSoon();
    expect(taskManager.runSoon).toHaveBeenCalledWith('shared-task');
  });

  it('logs an error and continues when runSoon fails with an unexpected error', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon
      .mockRejectedValueOnce(new Error('missing'))
      .mockResolvedValueOnce(runSoonResult('good-task'));
    syncTasks.setTaskManager(taskManager);

    syncTasks.register('bad-task');
    syncTasks.register('good-task');
    syncTasks.runSoon();

    await flushRetries();

    expect(taskManager.runSoon).toHaveBeenCalledWith('bad-task');
    expect(taskManager.runSoon).toHaveBeenCalledWith('good-task');
    expect(taskManager.runSoon).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('retries and does not log an error when the task is already running', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon
      .mockRejectedValueOnce(currentlyRunningError('my-sync-task'))
      .mockResolvedValueOnce(runSoonResult('my-sync-task'));
    syncTasks.setTaskManager(taskManager);

    syncTasks.register('my-sync-task');
    syncTasks.runSoon();

    await flushRetries();

    expect(taskManager.runSoon).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('already running'));
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs an error once retries are exhausted for a task stuck as already running', async () => {
    const syncTasks = new MaintenanceWindowSyncTasks(logger);
    const taskManager = taskManagerMock.createStart();
    taskManager.runSoon.mockRejectedValue(currentlyRunningError('stuck-task'));
    syncTasks.setTaskManager(taskManager);

    syncTasks.register('stuck-task');
    syncTasks.runSoon();

    await flushRetries();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalled();
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
