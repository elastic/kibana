/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { hasReachedTheQueuedActionsLimit } from './has_reached_queued_actions_limit';

const mockTaskManager = taskManagerMock.createStart();
const mockActionsConfig = actionsConfigMock.create();

beforeEach(() => {
  jest.resetAllMocks();
  mockTaskManager.aggregate.mockResolvedValue({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    aggregations: {},
  });
  mockActionsConfig.getMaxQueued.mockReturnValue(10);
});

describe('hasReachedTheQueuedActionsLimit()', () => {
  test('returns true if the number of queued actions is greater than the config limit', async () => {
    mockTaskManager.aggregate.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 3, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {},
    });
    mockActionsConfig.getMaxQueued.mockReturnValueOnce(2);

    expect(await hasReachedTheQueuedActionsLimit(mockTaskManager, mockActionsConfig, 1)).toEqual({
      hasReachedLimit: true,
      numberOverLimit: 2,
    });
  });

  test('returns true if the number of queued actions is equal the config limit', async () => {
    mockTaskManager.aggregate.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 2, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {},
    });
    mockActionsConfig.getMaxQueued.mockReturnValueOnce(3);

    expect(await hasReachedTheQueuedActionsLimit(mockTaskManager, mockActionsConfig, 1)).toEqual({
      hasReachedLimit: true,
      numberOverLimit: 0,
    });
  });

  test('returns false if the number of queued actions is less than the config limit', async () => {
    mockTaskManager.aggregate.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 1, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {},
    });
    mockActionsConfig.getMaxQueued.mockReturnValueOnce(3);

    expect(await hasReachedTheQueuedActionsLimit(mockTaskManager, mockActionsConfig, 1)).toEqual({
      hasReachedLimit: false,
      numberOverLimit: 0,
    });
  });
});
