/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskStoreMock } from '../task_store.mock';
import { mockLogger } from '../test_utils';
import { asOk, asErr } from './result_type';
import type { ConcreteTaskInstance } from '../task';
import { TaskStatus } from '../task';
import { MAX_TASKS_TO_RESET, resetInFlightTasksOwnedByThisNode } from './task_reconciliation';

const mockTask = (overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance =>
  ({
    id: 'task-1',
    version: 'WzEsMV0=',
    taskType: 'sampleTask',
    status: TaskStatus.Running,
    ownerId: 'kibana:5b2de169-2785-441b-ae8c-186a1936b17d',
    startedAt: new Date('2026-07-13T10:00:00.000Z'),
    retryAt: new Date('2026-07-13T10:05:00.000Z'),
    runAt: new Date('2026-07-13T10:00:00.000Z'),
    scheduledAt: new Date('2026-07-13T10:00:00.000Z'),
    attempts: 1,
    ...overrides,
  } as ConcreteTaskInstance);

describe('resetInFlightTasksOwnedByThisNode', () => {
  const logger = mockLogger();
  const store = taskStoreMock.create({
    taskManagerId: 'kibana:5b2de169-2785-441b-ae8c-186a1936b17d',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    store.bulkPartialUpdate.mockImplementation(async (docs) => docs.map((doc) => asOk(doc)));
  });

  test('fetches this node`s in-flight tasks with the expected query', async () => {
    store.fetch.mockResolvedValueOnce({ docs: [], versionMap: new Map() });

    await resetInFlightTasksOwnedByThisNode({ logger, taskStore: store });

    expect(store.fetch).toHaveBeenCalledWith(
      {
        query: {
          bool: {
            must: [
              { term: { 'task.ownerId': 'kibana:5b2de169-2785-441b-ae8c-186a1936b17d' } },
              {
                bool: {
                  should: [
                    { term: { 'task.status': TaskStatus.Running } },
                    { term: { 'task.status': TaskStatus.Claiming } },
                  ],
                },
              },
            ],
          },
        },
        size: MAX_TASKS_TO_RESET,
        seq_no_primary_term: true,
      },
      true
    );
  });

  test('does not update anything when there are no in-flight tasks', async () => {
    store.fetch.mockResolvedValueOnce({ docs: [], versionMap: new Map() });

    await resetInFlightTasksOwnedByThisNode({ logger, taskStore: store });

    expect(store.bulkPartialUpdate).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith('No in-flight tasks from a previous run to reset');
  });

  test('resets in-flight tasks to idle, clearing ownership fields but not attempts', async () => {
    store.fetch.mockResolvedValueOnce({
      docs: [
        mockTask({ id: 'task-1', version: 'WzEsMV0=' }),
        mockTask({
          id: 'task-2',
          version: 'WzIsMV0=',
          taskType: 'otherTask',
          status: TaskStatus.Claiming,
        }),
      ],
      versionMap: new Map(),
    });

    await resetInFlightTasksOwnedByThisNode({ logger, taskStore: store });

    expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(1);
    const updates = store.bulkPartialUpdate.mock.calls[0][0];
    expect(updates).toEqual([
      {
        id: 'task-1',
        version: 'WzEsMV0=',
        status: TaskStatus.Idle,
        ownerId: null,
        startedAt: null,
        retryAt: null,
        scheduledAt: expect.any(Date),
      },
      {
        id: 'task-2',
        version: 'WzIsMV0=',
        status: TaskStatus.Idle,
        ownerId: null,
        startedAt: null,
        retryAt: null,
        scheduledAt: expect.any(Date),
      },
    ]);
    expect(updates[0]).not.toHaveProperty('attempts');

    expect(logger.info).toHaveBeenCalledWith(
      'Reset in-flight task "task-1" of type "sampleTask" from status "running" to "idle" following an unclean shutdown'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Reset in-flight task "task-2" of type "otherTask" from status "claiming" to "idle" following an unclean shutdown'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Reset 2 in-flight task(s) owned by this node following an unclean shutdown (otherTask: 1, sampleTask: 1); skipped 0 task(s) claimed by another node; failed to reset 0 task(s)'
    );
  });

  test('applies updates in batches of 100', async () => {
    store.fetch.mockResolvedValueOnce({
      docs: Array.from({ length: 250 }, (_, i) => mockTask({ id: `task-${i}` })),
      versionMap: new Map(),
    });

    await resetInFlightTasksOwnedByThisNode({ logger, taskStore: store });

    expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(3);
    expect(store.bulkPartialUpdate.mock.calls[0][0]).toHaveLength(100);
    expect(store.bulkPartialUpdate.mock.calls[1][0]).toHaveLength(100);
    expect(store.bulkPartialUpdate.mock.calls[2][0]).toHaveLength(50);
  });

  test('skips version conflicts silently and logs other update errors', async () => {
    store.fetch.mockResolvedValueOnce({
      docs: [
        mockTask({ id: 'task-1' }),
        mockTask({ id: 'task-2', version: 'WzIsMV0=' }),
        mockTask({ id: 'task-3', version: 'WzMsMV0=' }),
      ],
      versionMap: new Map(),
    });
    store.bulkPartialUpdate.mockResolvedValueOnce([
      asOk({ id: 'task-1', version: 'WzQsMV0=' }),
      asErr({
        type: 'task',
        id: 'task-2',
        status: 409,
        error: { type: 'version_conflict_engine_exception' },
      }),
      asErr({
        type: 'task',
        id: 'task-3',
        status: 500,
        error: { type: 'server_error', reason: 'boom' },
      }),
    ]);

    await resetInFlightTasksOwnedByThisNode({ logger, taskStore: store });

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Error resetting in-flight task "task-3" following an unclean shutdown: {"type":"server_error","reason":"boom"}'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Reset 1 in-flight task(s) owned by this node following an unclean shutdown (sampleTask: 1); skipped 1 task(s) claimed by another node; failed to reset 1 task(s)'
    );
  });

  test('warns when the reset cap is reached', async () => {
    store.fetch.mockResolvedValueOnce({
      docs: Array.from({ length: MAX_TASKS_TO_RESET }, (_, i) => mockTask({ id: `task-${i}` })),
      versionMap: new Map(),
    });

    await resetInFlightTasksOwnedByThisNode({ logger, taskStore: store });

    expect(logger.warn).toHaveBeenCalledWith(
      `Found at least ${MAX_TASKS_TO_RESET} in-flight tasks from a previous run; only the first ${MAX_TASKS_TO_RESET} will be reset, the rest will be picked up once their retry timeout expires`
    );
    expect(store.bulkPartialUpdate).toHaveBeenCalledTimes(MAX_TASKS_TO_RESET / 100);
  });

  test('resolves and logs an error when the fetch fails', async () => {
    store.fetch.mockRejectedValueOnce(new Error('search failed'));

    await expect(
      resetInFlightTasksOwnedByThisNode({ logger, taskStore: store })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to reset in-flight tasks owned by this node following an unclean shutdown: search failed'
    );
    expect(store.bulkPartialUpdate).not.toHaveBeenCalled();
  });

  test('resolves and logs an error when the bulk update fails', async () => {
    store.fetch.mockResolvedValueOnce({
      docs: [mockTask({ id: 'task-1' })],
      versionMap: new Map(),
    });
    store.bulkPartialUpdate.mockRejectedValueOnce(new Error('bulk failed'));

    await expect(
      resetInFlightTasksOwnedByThisNode({ logger, taskStore: store })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to reset in-flight tasks owned by this node following an unclean shutdown: bulk failed'
    );
  });
});
