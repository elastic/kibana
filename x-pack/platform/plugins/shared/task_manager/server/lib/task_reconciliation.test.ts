/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '../task';
import type { ConcreteTaskInstance } from '../task';
import { mockLogger } from '../test_utils';
import { taskStoreMock } from '../task_store.mock';
import { reconcileTasksOnStartup } from './task_reconciliation';

const now = new Date('2026-04-10T12:00:00.000Z');

function createMockTask({
  id,
  taskType,
  status,
}: {
  id: string;
  taskType: string;
  status: TaskStatus;
}): ConcreteTaskInstance {
  return {
    id,
    taskType,
    taskTypeVersion: '1.0.0',
    schedule: { interval: '1m' },
    attempts: 1,
    status,
    params: {},
    state: {},
    traceparent: '',
    scope: [],
    enabled: true,
    runAt: new Date('2026-04-10T11:59:00.000Z'),
    scheduledAt: new Date('2026-04-10T11:59:00.000Z'),
    startedAt: new Date('2026-04-10T11:58:30.000Z'),
    retryAt: new Date('2026-04-10T12:00:30.000Z'),
    ownerId: 'kibana:node-a',
    partition: 1,
    version: 'WzEsMV0=',
  } as ConcreteTaskInstance;
}

describe('reconcileTasksOnStartup', () => {
  test('logs and reconciles recovered tasks', async () => {
    const logger = mockLogger();
    const taskStore = taskStoreMock.create({ taskManagerId: 'kibana:node-a' });
    const taskA = createMockTask({
      id: 'task-a',
      taskType: 'alerting:.index-threshold',
      status: TaskStatus.Running,
    });
    const taskB = createMockTask({
      id: 'task-b',
      taskType: 'alerting:.es-query',
      status: TaskStatus.Claiming,
    });

    taskStore.fetch.mockResolvedValue({
      docs: [taskA, taskB],
      versionMap: new Map(),
    });
    taskStore.updateByQuery.mockResolvedValue({
      total: 2,
      updated: 2,
      version_conflicts: 0,
    });

    const result = await reconcileTasksOnStartup({ taskStore, logger, now });

    expect(result.recoveredTasks).toEqual([taskA, taskB]);
    expect(result.updated).toBe(2);
    expect(result.limitedByMaxTasks).toBe(false);
    expect(taskStore.fetch).toHaveBeenCalledWith({
      query: {
        bool: {
          must: [
            { term: { 'task.ownerId': 'kibana:node-a' } },
            {
              bool: {
                should: [
                  { term: { 'task.status': TaskStatus.Running } },
                  { term: { 'task.status': TaskStatus.Claiming } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      size: 10000,
      sort: [{ 'task.runAt': 'asc' }],
    });
    expect(taskStore.updateByQuery).toHaveBeenCalledWith({
      query: {
        bool: {
          must: [{ ids: { values: ['task:task-a', 'task:task-b'] } }],
        },
      },
      script: {
        lang: 'painless',
        source:
          'ctx._source.task.status = params.status; ctx._source.task.ownerId = null; ctx._source.task.startedAt = null; ctx._source.task.retryAt = null; ctx._source.task.scheduledAt = params.scheduledAt;',
        params: {
          status: TaskStatus.Idle,
          scheduledAt: now.toISOString(),
        },
      },
    });
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Recovered task [task-a] of type [alerting:.index-threshold]')
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Recovered task [task-b] of type [alerting:.es-query]')
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Recovered 2 task(s) that were owned by [kibana:node-a] from a previous run.'
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Reconciled 2 task(s) from previous node run:')
    );
  });

  test('does not reconcile when no tasks are found', async () => {
    const logger = mockLogger();
    const taskStore = taskStoreMock.create({ taskManagerId: 'kibana:node-a' });

    taskStore.fetch.mockResolvedValue({
      docs: [],
      versionMap: new Map(),
    });

    const result = await reconcileTasksOnStartup({ taskStore, logger, now });

    expect(result).toEqual({
      recoveredTasks: [],
      updated: 0,
      limitedByMaxTasks: false,
    });
    expect(taskStore.updateByQuery).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith('No tasks to reconcile on startup.');
  });
});
