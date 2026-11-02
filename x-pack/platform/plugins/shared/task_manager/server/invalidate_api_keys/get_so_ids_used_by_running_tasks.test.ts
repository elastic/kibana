/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { RunningTask } from '@kbn/response-ops-scoped-api-keys';
import { getSOIdsUsedByRunningTasks } from './get_so_ids_used_by_running_tasks';

const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

describe('getSOIdsUsedByRunningTasks', () => {
  const taskStartedAt = '2026-10-05T00:00:00.000Z';
  const futureRetryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const pastRetryAt = new Date(Date.now() - 60 * 1000).toISOString();

  const runningTaskSO = (
    id: string,
    attributes: { status: string; startedAt: string | null; retryAt: string | null }
  ) => ({ id, type: 'task', attributes, references: [] });

  const runsBySOId = (...entries: Array<[string, string]>) =>
    new Map<string, RunningTask>(
      entries.map(([soId, taskId]) => [soId, { taskId, taskStartedAt }])
    );

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns the SO while the same run is still in progress', async () => {
    internalSavedObjectsRepository.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        runningTaskSO('task-1', {
          status: 'running',
          startedAt: taskStartedAt,
          retryAt: futureRetryAt,
        }),
      ],
    });

    const result = await getSOIdsUsedByRunningTasks(
      runsBySOId(['1', 'task-1']),
      internalSavedObjectsRepository
    );

    expect(internalSavedObjectsRepository.bulkGet).toHaveBeenCalledWith([
      { type: 'task', id: 'task-1' },
    ]);
    expect(result).toEqual(new Set(['1']));
  });

  test('looks up each task once when several SOs share it', async () => {
    internalSavedObjectsRepository.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        runningTaskSO('task-1', {
          status: 'running',
          startedAt: taskStartedAt,
          retryAt: futureRetryAt,
        }),
      ],
    });

    const result = await getSOIdsUsedByRunningTasks(
      runsBySOId(['1', 'task-1'], ['2', 'task-1']),
      internalSavedObjectsRepository
    );

    expect(internalSavedObjectsRepository.bulkGet).toHaveBeenCalledWith([
      { type: 'task', id: 'task-1' },
    ]);
    expect(result).toEqual(new Set(['1', '2']));
  });

  test.each([
    ['a new run has started', { status: 'running', startedAt: '2026-10-05T01:00:00.000Z' }],
    ['the task is idle', { status: 'idle', startedAt: null }],
    ['retryAt has passed', { status: 'running', startedAt: taskStartedAt, retryAt: pastRetryAt }],
  ])('returns nothing when %s', async (_, taskAttributes) => {
    internalSavedObjectsRepository.bulkGet.mockResolvedValueOnce({
      saved_objects: [runningTaskSO('task-1', { retryAt: futureRetryAt, ...taskAttributes })],
    });

    const result = await getSOIdsUsedByRunningTasks(
      runsBySOId(['1', 'task-1']),
      internalSavedObjectsRepository
    );

    expect(result).toEqual(new Set());
  });

  test('returns nothing when the task no longer exists', async () => {
    internalSavedObjectsRepository.bulkGet.mockResolvedValueOnce({
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

    const result = await getSOIdsUsedByRunningTasks(
      runsBySOId(['1', 'task-1']),
      internalSavedObjectsRepository
    );

    expect(result).toEqual(new Set());
  });

  test('does not look up tasks when no key was replaced during a run', async () => {
    const result = await getSOIdsUsedByRunningTasks(new Map(), internalSavedObjectsRepository);

    expect(internalSavedObjectsRepository.bulkGet).not.toHaveBeenCalled();
    expect(result).toEqual(new Set());
  });
});
