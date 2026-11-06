/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { TaskStatus, type ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { LockAcquisitionError } from '@kbn/lock-manager';
import {
  REPOSITORY_VERSION_DEFER_MAX_MS,
  anySupersededForced,
  deferForRepositoryVersion,
  findSupersededTasks,
  getRequestTaskStatus,
  isStaleRepositoryRequest,
  isTaskSuperseded,
  markSupersededTasks,
  reviveSupersededTask,
  runTaskUnderInstallLock,
  shouldDeferForRepositoryVersion,
  waitUntilTaskCompleted,
  type InstallLockManager,
} from './utils';

describe('isTaskSuperseded', () => {
  it('reads the superseded marker from the task state', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue(task({ state: { superseded: true } }));
    await expect(isTaskSuperseded({ taskManager, taskId: 't1' })).resolves.toBe(true);

    taskManager.get.mockResolvedValue(task({ state: {} }));
    await expect(isTaskSuperseded({ taskManager, taskId: 't1' })).resolves.toBe(false);
  });

  it('treats a task that no longer exists as not superseded and propagates other errors', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', 't1')
    );
    await expect(isTaskSuperseded({ taskManager, taskId: 't1' })).resolves.toBe(false);

    taskManager.get.mockRejectedValue(new Error('es unavailable'));
    await expect(isTaskSuperseded({ taskManager, taskId: 't1' })).rejects.toThrow('es unavailable');
  });
});

describe('anySupersededForced', () => {
  it('is true when any superseded task carried a forced update', () => {
    expect(
      anySupersededForced([task({ params: {} }), task({ params: { forceUpdate: true } })])
    ).toBe(true);
    expect(anySupersededForced([task({ params: { forceUpdate: false } }), task({})])).toBe(false);
    expect(anySupersededForced([])).toBe(false);
  });
});

const task = (fields: Partial<ConcreteTaskInstance>) => fields as ConcreteTaskInstance;

describe('isStaleRepositoryRequest', () => {
  it('is stale only when documentation was installed from a newer repository than requested', () => {
    expect(
      isStaleRepositoryRequest({
        requestedVersion: '2026-10-01T00:00:00.000Z',
        installedVersion: '2026-10-12T00:00:00.000Z',
      })
    ).toBe(true);
    expect(
      isStaleRepositoryRequest({
        requestedVersion: '2026-10-12T00:00:00.000Z',
        installedVersion: '2026-10-12T00:00:00.000Z',
      })
    ).toBe(false);
    expect(
      isStaleRepositoryRequest({
        requestedVersion: '2026-10-12T00:00:00.000Z',
        installedVersion: '2026-10-01T00:00:00.000Z',
      })
    ).toBe(false);
    expect(isStaleRepositoryRequest({ installedVersion: '2026-10-12T00:00:00.000Z' })).toBe(false);
    expect(isStaleRepositoryRequest({ requestedVersion: '2026-10-12T00:00:00.000Z' })).toBe(false);
  });
});

describe('findSupersededTasks', () => {
  const find = (repositoryVersion?: string) =>
    findSupersededTasks({
      taskManager,
      taskType: 'ProductDocBase:EnsureUpToDate',
      inferenceId: '.elser',
      repositoryVersion,
    });
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;

  beforeEach(() => {
    taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({
      docs: [
        task({ id: 'older', params: { repositoryVersion: '2026-10-01T00:00:00.000Z' } }),
        task({ id: 'same', params: { repositoryVersion: '2026-10-12T00:00:00.000Z' } }),
        task({ id: 'newer', params: { repositoryVersion: '2026-10-20T00:00:00.000Z' } }),
        task({ id: 'remote', params: {} }),
      ],
      versionMap: new Map(),
    });
  });

  it('finds only waiting tasks requested against an older repository version', async () => {
    const superseded = await find('2026-10-12T00:00:00.000Z');

    expect(taskManager.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: [
              { term: { 'task.taskType': 'ProductDocBase:EnsureUpToDate' } },
              { term: { 'task.scope': 'productDoc:inference:default' } },
              { terms: { 'task.status': [TaskStatus.Idle, TaskStatus.Claiming] } },
            ],
          },
        },
      })
    );
    expect(superseded.map(({ id }) => id)).toEqual(['older']);
  });

  it('finds nothing for requests without a repository version', async () => {
    await expect(find(undefined)).resolves.toEqual([]);

    expect(taskManager.fetch).not.toHaveBeenCalled();
  });
});

describe('markSupersededTasks', () => {
  it('sets the superseded marker on the given tasks without deleting them', async () => {
    const taskManager = taskManagerMock.createStart();

    await markSupersededTasks({
      taskManager,
      logger: loggerMock.create(),
      taskType: 'ProductDocBase:EnsureUpToDate',
      inferenceId: '.elser',
      tasks: [task({ id: 'older' })],
    });

    expect(taskManager.bulkUpdateState).toHaveBeenCalledWith(['older'], expect.any(Function));
    const [, mapState] = taskManager.bulkUpdateState.mock.calls[0];
    expect(mapState({ other: 1 }, 'older')).toEqual({ other: 1, superseded: true });
    expect(taskManager.bulkRemove).not.toHaveBeenCalled();
  });

  it('does nothing without tasks', async () => {
    const taskManager = taskManagerMock.createStart();

    await markSupersededTasks({
      taskManager,
      logger: loggerMock.create(),
      taskType: 'ProductDocBase:EnsureUpToDate',
      inferenceId: '.elser',
      tasks: [],
    });

    expect(taskManager.bulkUpdateState).not.toHaveBeenCalled();
  });
});

describe('reviveSupersededTask', () => {
  it('clears the marker of a superseded task', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue(task({ id: 'fixed', state: { superseded: true } }));

    await reviveSupersededTask({ taskManager, logger: loggerMock.create(), taskId: 'fixed' });

    expect(taskManager.bulkUpdateState).toHaveBeenCalledWith(['fixed'], expect.any(Function));
    const [, mapState] = taskManager.bulkUpdateState.mock.calls[0];
    expect(mapState({ superseded: true }, 'fixed')).toEqual({ superseded: false });
  });

  it('leaves a task that is not superseded or does not exist alone', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue(task({ id: 'fixed', state: {} }));
    await reviveSupersededTask({ taskManager, logger: loggerMock.create(), taskId: 'fixed' });

    taskManager.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'fixed')
    );
    await reviveSupersededTask({ taskManager, logger: loggerMock.create(), taskId: 'fixed' });

    expect(taskManager.bulkUpdateState).not.toHaveBeenCalled();
  });
});

describe('getRequestTaskStatus', () => {
  const status = (docs: ConcreteTaskInstance[]) => {
    const taskManager = taskManagerMock.createStart();
    taskManager.fetch.mockResolvedValue({ docs, versionMap: new Map() });
    return getRequestTaskStatus({
      taskManager,
      taskType: 'ProductDocBase:EnsureUpToDate',
      inferenceId: '.elser',
    });
  };

  it('does not count a superseded task as pending', async () => {
    await expect(
      status([task({ status: TaskStatus.Idle, state: { superseded: true } })])
    ).resolves.toBe('none');
    await expect(
      status([
        task({ status: TaskStatus.Idle, state: { superseded: true } }),
        task({ status: TaskStatus.Failed }),
      ])
    ).resolves.toBe('failed');
    await expect(status([task({ status: TaskStatus.Idle, state: {} })])).resolves.toBe('pending');
  });
});

describe('deferrals keep the task state', () => {
  const state = { superseded: true };

  it('runTaskUnderInstallLock hands the state back when the lock is held', async () => {
    const withLock = jest.fn(async () => {
      throw new LockAcquisitionError('held');
    });

    await expect(
      runTaskUnderInstallLock({
        lockManager: { withLock } as unknown as InstallLockManager,
        run: jest.fn(),
        state,
      })
    ).resolves.toEqual({ state, runAt: expect.any(Date) });
  });

  it('runTaskUnderInstallLock hands the state back after a run', async () => {
    const withLock = jest.fn((_lockId: string, callback: () => Promise<void>) => callback());

    await expect(
      runTaskUnderInstallLock({
        lockManager: { withLock } as unknown as InstallLockManager,
        run: jest.fn(),
        state,
      })
    ).resolves.toEqual({ state });
  });

  it('deferForRepositoryVersion hands the state back', () => {
    expect(deferForRepositoryVersion(state)).toEqual({ state, runAt: expect.any(Date) });
    expect(deferForRepositoryVersion()).toEqual({ state: {}, runAt: expect.any(Date) });
  });
});

describe('shouldDeferForRepositoryVersion', () => {
  const now = Date.parse('2026-10-12T12:00:00.000Z');
  const requestedAt = new Date(now - 60_000).toISOString();

  it('defers a recent request against a newer repository than the local one', () => {
    expect(
      shouldDeferForRepositoryVersion({
        requestedVersion: '2026-10-12T00:00:00.000Z',
        localVersion: '2026-10-01T00:00:00.000Z',
        requestedAt,
        now,
      })
    ).toBe(true);
    expect(
      shouldDeferForRepositoryVersion({
        requestedVersion: '2026-10-12T00:00:00.000Z',
        localVersion: undefined,
        requestedAt,
        now,
      })
    ).toBe(true);
  });

  it('runs requests against the same or an older repository, or without a version', () => {
    expect(
      shouldDeferForRepositoryVersion({
        requestedVersion: '2026-10-12T00:00:00.000Z',
        localVersion: '2026-10-12T00:00:00.000Z',
        requestedAt,
        now,
      })
    ).toBe(false);
    expect(
      shouldDeferForRepositoryVersion({
        requestedVersion: '2026-10-01T00:00:00.000Z',
        localVersion: '2026-10-12T00:00:00.000Z',
        requestedAt,
        now,
      })
    ).toBe(false);
    expect(
      shouldDeferForRepositoryVersion({
        localVersion: '2026-10-12T00:00:00.000Z',
        requestedAt,
        now,
      })
    ).toBe(false);
  });

  it('stops deferring once the request is old enough that no newer node may exist', () => {
    expect(
      shouldDeferForRepositoryVersion({
        requestedVersion: '2026-10-12T00:00:00.000Z',
        localVersion: '2026-10-01T00:00:00.000Z',
        requestedAt: new Date(now - REPOSITORY_VERSION_DEFER_MAX_MS).toISOString(),
        now,
      })
    ).toBe(false);
  });
});

describe('waitUntilTaskCompleted', () => {
  it('resolves once the task is no longer found', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'my-task')
    );

    await expect(
      waitUntilTaskCompleted({ taskManager, taskId: 'my-task', timeout: 50, interval: 1 })
    ).resolves.toBeUndefined();
    expect(taskManager.get).toHaveBeenCalledTimes(1);
  });

  it('keeps polling at the regular interval through transient read failures', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get
      .mockRejectedValueOnce(new Error('es unavailable'))
      .mockResolvedValueOnce({ status: 'failed' } as ConcreteTaskInstance);

    await expect(
      waitUntilTaskCompleted({ taskManager, taskId: 'my-task', timeout: 1_000, interval: 1 })
    ).resolves.toBeUndefined();
    expect(taskManager.get).toHaveBeenCalledTimes(2);
  });

  it('gives up after the timeout when status reads keep failing instead of polling hot', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(new Error('es unavailable'));

    await expect(
      waitUntilTaskCompleted({ taskManager, taskId: 'my-task', timeout: 40, interval: 10 })
    ).rejects.toThrow('Timeout waiting for task my-task to complete.');
    expect(taskManager.get.mock.calls.length).toBeLessThanOrEqual(6);
  });
});
