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
import {
  REPOSITORY_VERSION_DEFER_MAX_MS,
  anySupersededForced,
  isStaleRepositoryRequest,
  isTaskSuperseded,
  markSupersededTasks,
  shouldDeferForRepositoryVersion,
  waitUntilTaskCompleted,
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

describe('markSupersededTasks', () => {
  const schedule = (repositoryVersion?: string) =>
    markSupersededTasks({
      taskManager,
      logger: loggerMock.create(),
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

  it('marks only waiting tasks requested against an older repository version and returns them', async () => {
    const superseded = await schedule('2026-10-12T00:00:00.000Z');

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
    expect(taskManager.bulkUpdateState).toHaveBeenCalledWith(['older'], expect.any(Function));
    const [, mapState] = taskManager.bulkUpdateState.mock.calls[0];
    expect(mapState({ other: 1 }, 'older')).toEqual({ other: 1, superseded: true });
    expect(taskManager.bulkRemove).not.toHaveBeenCalled();
    expect(superseded.map(({ id }) => id)).toEqual(['older']);
  });

  it('does nothing for requests without a repository version', async () => {
    await expect(schedule(undefined)).resolves.toEqual([]);

    expect(taskManager.fetch).not.toHaveBeenCalled();
    expect(taskManager.bulkUpdateState).not.toHaveBeenCalled();
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
