/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeVersion } from '@kbn/core-saved-objects-base-server-internal';
import { taskStoreMock } from '../task_store.mock';
import { mockLogger } from '../test_utils';
import { TaskStatus } from '../task';
import { asErr, asOk } from './result_type';
import { requeueRunningTasksOwnedByThisInstance } from './requeue_running_tasks_owned_by_this_instance';

const TASK_MANAGER_ID = 'kibana:test-uuid';

describe('requeueRunningTasksOwnedByThisInstance', () => {
  const logger = mockLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not call bulkPartialUpdate when no tasks match', async () => {
    const taskStore = taskStoreMock.create({ taskManagerId: TASK_MANAGER_ID });
    taskStore.fetch.mockResolvedValue({ docs: [], versionMap: new Map() });

    await requeueRunningTasksOwnedByThisInstance({ taskStore, logger });

    expect(taskStore.fetch).toHaveBeenCalledTimes(1);
    expect(taskStore.bulkPartialUpdate).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('logs per-task details before requeueing', async () => {
    const taskStore = taskStoreMock.create({ taskManagerId: TASK_MANAGER_ID });
    taskStore.fetch.mockResolvedValue({
      docs: [
        {
          id: 'task-1',
          taskType: 'alerting:rule',
          status: TaskStatus.Running,
          attempts: 2,
          runAt: new Date('2025-01-01T00:00:00Z'),
          startedAt: new Date('2025-01-01T00:01:00Z'),
          retryAt: new Date('2025-01-01T00:06:00Z'),
        },
        {
          id: 'task-2',
          taskType: 'actions:email',
          status: TaskStatus.Claiming,
          attempts: 0,
          runAt: new Date('2025-01-01T00:02:00Z'),
          startedAt: null,
          retryAt: null,
        },
      ],
      versionMap: new Map([
        ['task-1', { esId: 'task:task-1', seqNo: 1, primaryTerm: 1 }],
        ['task-2', { esId: 'task:task-2', seqNo: 2, primaryTerm: 1 }],
      ]),
    } as never);
    taskStore.bulkPartialUpdate.mockResolvedValue([
      asOk({ id: 'task-1' }),
      asOk({ id: 'task-2' }),
    ] as never);

    await requeueRunningTasksOwnedByThisInstance({ taskStore, logger });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Found 2 running/claiming task(s)')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('id="task-1", type="alerting:rule", status="running"')
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('attempts=2'));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('id="task-2", type="actions:email", status="claiming"')
    );
  });

  test('calls bulkPartialUpdate with version and cleared fields', async () => {
    const taskStore = taskStoreMock.create({ taskManagerId: TASK_MANAGER_ID });
    const runAt = new Date('2025-01-01T00:00:00Z');
    taskStore.fetch.mockResolvedValue({
      docs: [
        {
          id: 'task-1',
          taskType: 'alerting:rule',
          status: TaskStatus.Running,
          attempts: 1,
          runAt,
          startedAt: new Date('2025-01-01T00:01:00Z'),
          retryAt: new Date('2025-01-01T00:06:00Z'),
        },
      ],
      versionMap: new Map([['task-1', { esId: 'task:task-1', seqNo: 5, primaryTerm: 2 }]]),
    } as never);
    taskStore.bulkPartialUpdate.mockResolvedValue([asOk({ id: 'task-1' })] as never);

    await requeueRunningTasksOwnedByThisInstance({ taskStore, logger });

    expect(taskStore.bulkPartialUpdate).toHaveBeenCalledTimes(1);
    expect(taskStore.bulkPartialUpdate).toHaveBeenCalledWith([
      {
        id: 'task-1',
        version: encodeVersion(5, 2),
        status: TaskStatus.Idle,
        startedAt: null,
        retryAt: null,
        ownerId: null,
        scheduledAt: runAt,
      },
    ]);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Requeued 1 task(s)'));
  });

  test('skips tasks missing version info', async () => {
    const taskStore = taskStoreMock.create({ taskManagerId: TASK_MANAGER_ID });
    taskStore.fetch.mockResolvedValue({
      docs: [
        {
          id: 'task-1',
          taskType: 'x',
          status: TaskStatus.Running,
          attempts: 0,
          runAt: new Date(),
          startedAt: null,
          retryAt: null,
        },
      ],
      versionMap: new Map([['task-1', { esId: 'task:task-1' }]]),
    } as never);

    await requeueRunningTasksOwnedByThisInstance({ taskStore, logger });

    expect(taskStore.bulkPartialUpdate).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Skipping requeue for task "task-1"')
    );
  });

  test('logs version conflicts when present', async () => {
    const taskStore = taskStoreMock.create({ taskManagerId: TASK_MANAGER_ID });
    taskStore.fetch.mockResolvedValue({
      docs: [
        {
          id: 'task-1',
          taskType: 'x',
          status: TaskStatus.Running,
          attempts: 0,
          runAt: new Date(),
          startedAt: null,
          retryAt: null,
        },
      ],
      versionMap: new Map([['task-1', { esId: 'task:task-1', seqNo: 1, primaryTerm: 1 }]]),
    } as never);
    taskStore.bulkPartialUpdate.mockResolvedValue([
      asErr({
        type: 'task',
        id: 'task-1',
        status: 409,
        error: { type: 'version_conflict_engine_exception', reason: 'version conflict' },
      }),
    ] as never);

    await requeueRunningTasksOwnedByThisInstance({ taskStore, logger });

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('1 task(s) skipped due to version conflict')
    );
  });

  test('handles errors gracefully', async () => {
    const taskStore = taskStoreMock.create({ taskManagerId: TASK_MANAGER_ID });
    taskStore.fetch.mockRejectedValue(new Error('index_not_found_exception'));

    await requeueRunningTasksOwnedByThisInstance({ taskStore, logger });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to requeue running tasks')
    );
  });
});
