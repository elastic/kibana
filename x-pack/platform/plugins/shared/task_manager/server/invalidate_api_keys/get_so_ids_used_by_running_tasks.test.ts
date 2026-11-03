/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getSOIdsUsedByRunningTasks } from './get_so_ids_used_by_running_tasks';

const savedObjectsClient = savedObjectsRepositoryMock.create();

describe('getSOIdsUsedByRunningTasks', () => {
  const taskStartedAt = '2026-10-05T00:00:00.000Z';
  const futureRetryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const pastRetryAt = new Date(Date.now() - 60 * 1000).toISOString();

  const runningTaskSO = (
    id: string,
    attributes: { status: string; startedAt: string | null; retryAt: string | null }
  ) => ({ id, type: 'task', attributes, references: [] });

  const getResult = (runningTasks: Array<[string, string]>) =>
    getSOIdsUsedByRunningTasks(
      new Map(runningTasks.map(([soId, taskId]) => [soId, { taskId, taskStartedAt }])),
      savedObjectsClient
    );

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns the pending SO while the same run is still in progress', async () => {
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        runningTaskSO('task-1', {
          status: 'running',
          startedAt: taskStartedAt,
          retryAt: futureRetryAt,
        }),
      ],
    });

    const result = await getResult([['1', 'task-1']]);

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([{ type: 'task', id: 'task-1' }]);
    expect(result).toEqual(new Set(['1']));
  });

  test('looks up each task once', async () => {
    savedObjectsClient.bulkGet.mockResolvedValueOnce({ saved_objects: [] });

    await getResult([
      ['1', 'task-1'],
      ['2', 'task-1'],
    ]);

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

    await expect(getResult([['1', 'task-1']])).resolves.toEqual(new Set());
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

    await expect(getResult([['1', 'task-1']])).resolves.toEqual(new Set());
  });

  test('does not look up tasks when there are none', async () => {
    await expect(getResult([])).resolves.toEqual(new Set());
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });
});
