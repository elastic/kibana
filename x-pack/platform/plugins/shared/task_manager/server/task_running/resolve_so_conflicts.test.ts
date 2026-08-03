/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type pRetry from 'p-retry';
import { mockLogger } from '../test_utils';
import { bufferedTaskStoreMock } from '../buffered_task_store.mock';
import type { ConcreteTaskInstance, PartialConcreteTaskInstance } from '../task';
import { TaskStatus } from '../task';
import { resolveTaskDocumentConflicts } from './resolve_so_conflicts';
import type { Updatable } from './task_runner';

jest.mock('p-retry', () => {
  const actual = jest.requireActual('p-retry');
  return {
    __esModule: true,
    default: (fn: Parameters<typeof pRetry>[0], options?: Parameters<typeof pRetry>[1]) =>
      actual.default(fn, { ...options, minTimeout: 0, factor: 1 }),
    AbortError: actual.AbortError,
  };
});

const createTask = (overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance => ({
  id: 'task-1',
  taskType: 'bar',
  scheduledAt: new Date('2020-01-01T00:00:00.000Z'),
  runAt: new Date('2020-01-01T00:00:00.000Z'),
  startedAt: new Date('2020-01-01T00:00:00.000Z'),
  retryAt: null,
  attempts: 0,
  status: TaskStatus.Running,
  params: {},
  state: {},
  ownerId: 'kibana-node-1',
  schedule: { interval: '1m' },
  version: 'WzEsMV0=',
  ...overrides,
});

describe('resolveTaskDocumentConflicts', () => {
  const logger = mockLogger();
  let store: jest.Mocked<Updatable>;
  let originalTask: ConcreteTaskInstance;
  let partialTask: PartialConcreteTaskInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    store = bufferedTaskStoreMock.create();
    originalTask = createTask();
    partialTask = {
      id: originalTask.id,
      status: TaskStatus.Idle,
      startedAt: null,
      retryAt: null,
      ownerId: null,
      state: { foo: 'bar' },
      runAt: new Date('2020-01-01T00:01:00.000Z'),
      schedule: { interval: '1m' },
    };
  });

  const resolve = () =>
    resolveTaskDocumentConflicts({
      taskId: originalTask.id,
      partialTask,
      originalTask,
      bufferedTaskStore: store,
      logger,
    });

  test('merges partial updates onto the current task and preserves its version', async () => {
    const currentTask = createTask({
      version: 'WzIsMV0=',
      state: { existing: true },
      startedAt: originalTask.startedAt,
    });
    store.get.mockResolvedValue(currentTask);
    store.partialUpdate.mockResolvedValue(currentTask);

    await resolve();

    expect(logger.debug).toHaveBeenCalledWith(
      'Resolving task document conflict for task "task-1" (attempt 1/3).'
    );
    expect(store.get).toHaveBeenCalledWith('task-1');
    expect(store.partialUpdate).toHaveBeenCalledTimes(1);
    expect(store.partialUpdate).toHaveBeenCalledWith(
      {
        ...currentTask,
        ...partialTask,
        version: 'WzIsMV0=',
      },
      { validate: false, doc: currentTask }
    );
  });

  test('keeps the current schedule when it changed while the task was running', async () => {
    const currentTask = createTask({
      version: 'WzIsMV0=',
      schedule: { interval: '5m' },
      startedAt: originalTask.startedAt,
    });
    store.get.mockResolvedValue(currentTask);
    store.partialUpdate.mockResolvedValue(currentTask);

    await resolve();

    expect(store.partialUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: { interval: '5m' },
        version: 'WzIsMV0=',
      }),
      { validate: false, doc: currentTask }
    );
  });

  test('keeps the current runAt when it changed while the task was running', async () => {
    const currentRunAt = new Date('2020-01-01T00:10:00.000Z');
    const currentTask = createTask({
      version: 'WzIsMV0=',
      runAt: currentRunAt,
      startedAt: originalTask.startedAt,
    });
    store.get.mockResolvedValue(currentTask);
    store.partialUpdate.mockResolvedValue(currentTask);

    await resolve();

    expect(store.partialUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        runAt: currentRunAt,
        version: 'WzIsMV0=',
      }),
      { validate: false, doc: currentTask }
    );
  });

  test('retries when partialUpdate fails and succeeds on a later attempt', async () => {
    const currentTask = createTask({
      version: 'WzIsMV0=',
      startedAt: originalTask.startedAt,
    });
    store.get.mockResolvedValue(currentTask);
    store.partialUpdate
      .mockRejectedValueOnce(new Error('temporary conflict'))
      .mockResolvedValueOnce(currentTask);

    await resolve();

    expect(store.get).toHaveBeenCalledTimes(2);
    expect(store.partialUpdate).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledWith(
      'Resolving task document conflict for task "task-1" (attempt 2/3).'
    );
  });

  test('throws when the task is not found', async () => {
    store.get.mockResolvedValue(null);

    await expect(resolve()).rejects.toThrow(
      'Unable to resolve task document conflicts for task "task-1": task not found'
    );
    expect(store.partialUpdate).not.toHaveBeenCalled();
    expect(store.get).toHaveBeenCalledTimes(3);
  });

  test('throws when the task was claimed by another worker', async () => {
    store.get.mockResolvedValue(
      createTask({
        ownerId: 'kibana-node-2',
        startedAt: originalTask.startedAt,
      })
    );

    await expect(resolve()).rejects.toThrow(
      'Unable to resolve task document conflicts for task "task-1": task has been claimed by another worker'
    );
    expect(store.partialUpdate).not.toHaveBeenCalled();
  });

  test('throws when attempts were updated by another worker', async () => {
    store.get.mockResolvedValue(
      createTask({
        attempts: 1,
        startedAt: originalTask.startedAt,
      })
    );

    await expect(resolve()).rejects.toThrow(
      'Unable to resolve task document conflicts for task "task-1": task attempts has been updated by another worker'
    );
    expect(store.partialUpdate).not.toHaveBeenCalled();
  });

  test('throws when startedAt was updated by another worker', async () => {
    store.get.mockResolvedValue(
      createTask({
        startedAt: new Date('2020-01-01T00:00:30.000Z'),
      })
    );

    await expect(resolve()).rejects.toThrow(
      'Unable to resolve task document conflicts for task "task-1": task startedAthas been updated by another worker'
    );
    expect(store.partialUpdate).not.toHaveBeenCalled();
  });
});
