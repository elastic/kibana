/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getSOIdsUsedByRunningTasks } from './get_so_ids_used_by_running_tasks';

const savedObjectsClient = savedObjectsRepositoryMock.create();
const taskStartedAt = '2026-10-05T00:00:00.000Z';
const futureRetryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const pastRetryAt = new Date(Date.now() - 60 * 1000).toISOString();

const runningTaskSO = (
  id: string,
  attributes: { status: string; startedAt: string | null; retryAt: string | null }
) => ({ id, type: 'task', attributes, references: [] });

const getResult = () =>
  getSOIdsUsedByRunningTasks(
    new Map([['pending-1', { taskId: 'task-1', taskStartedAt }]]),
    savedObjectsClient
  );

describe('getSOIdsUsedByRunningTasks', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns the pending saved object while the same run is still in progress', async () => {
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        runningTaskSO('task-1', {
          status: 'running',
          startedAt: taskStartedAt,
          retryAt: futureRetryAt,
        }),
      ],
    });

    await expect(getResult()).resolves.toEqual(new Set(['pending-1']));
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([{ type: 'task', id: 'task-1' }]);
  });

  test.each([
    ['a new run has started', { status: 'running', startedAt: '2026-10-05T01:00:00.000Z' }],
    ['the task is idle', { status: 'idle', startedAt: null }],
    ['retryAt has passed', { status: 'running', startedAt: taskStartedAt, retryAt: pastRetryAt }],
  ])('returns nothing when %s', async (_, taskAttributes) => {
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [runningTaskSO('task-1', { retryAt: futureRetryAt, ...taskAttributes })],
    });

    await expect(getResult()).resolves.toEqual(new Set());
  });

  test('returns nothing when the task no longer exists', async () => {
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'task-1',
          type: 'task',
          error: { statusCode: 404, error: 'Not Found', message: 'Not found' },
          attributes: undefined,
          references: [],
        },
      ],
    });

    await expect(getResult()).resolves.toEqual(new Set());
  });

  test('does not look up tasks when there are no running tasks', async () => {
    await expect(getSOIdsUsedByRunningTasks(new Map(), savedObjectsClient)).resolves.toEqual(
      new Set()
    );
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });
});
