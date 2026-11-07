/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { setTimeout as sleep } from 'timers/promises';
import { cancelTask, pollTaskUntil, waitForTaskToComplete } from './wait_for_task';

jest.mock('timers/promises', () => ({ setTimeout: jest.fn().mockResolvedValue(undefined) }));

const TASK_ID = 'test-task-id:123';

function createMockEsClient(
  responses: Array<{ completed: boolean; response?: unknown; error?: unknown }>
): jest.Mocked<ElasticsearchClient> {
  const tasksGet = jest.fn();
  for (const res of responses) {
    tasksGet.mockResolvedValueOnce(res);
  }
  return { tasks: { get: tasksGet } } as unknown as jest.Mocked<ElasticsearchClient>;
}

describe('waitForTaskToComplete', () => {
  const mockLogger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the task response immediately when the task is already complete', async () => {
    const taskResponse = { total: 5, created: 5 };
    const esClient = createMockEsClient([{ completed: true, response: taskResponse }]);

    const result = await waitForTaskToComplete<typeof taskResponse>({
      esClient,
      taskId: TASK_ID,
      logger: mockLogger,
    });

    expect(result).toEqual(taskResponse);
    expect(esClient.tasks.get as jest.Mock).toHaveBeenCalledTimes(1);
    expect(esClient.tasks.get as jest.Mock).toHaveBeenCalledWith(
      { task_id: TASK_ID, wait_for_completion: false },
      expect.anything()
    );
  });

  it('throws immediately (AbortError) when the task itself reports an error', async () => {
    const esClient = createMockEsClient([
      { completed: false, error: { reason: 'shard unavailable' } },
    ]);

    await expect(
      waitForTaskToComplete({ esClient, taskId: TASK_ID, logger: mockLogger })
    ).rejects.toThrow('Task "test-task-id:123" failed: shard unavailable');

    // Must not retry — tasks.get called exactly once
    expect(esClient.tasks.get as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('polls until the task completes, logging a debug message on each wait', async () => {
    const taskResponse = { total: 3, updated: 3 };
    const esClient = createMockEsClient([
      { completed: false },
      { completed: false },
      { completed: true, response: taskResponse },
    ]);

    const result = await waitForTaskToComplete<typeof taskResponse>({
      esClient,
      taskId: TASK_ID,
      logger: mockLogger,
      minTimeout: 1,
      maxTimeout: 1,
    });

    expect(result).toEqual(taskResponse);
    expect(esClient.tasks.get as jest.Mock).toHaveBeenCalledTimes(3);
    expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    expect(mockLogger.debug).toHaveBeenCalledWith(`Waiting for task "${TASK_ID}" to complete...`);
  });
});

describe('pollTaskUntil', () => {
  const notFound = Object.assign(new Error('Not Found'), { meta: { statusCode: 404 } });

  beforeEach(() => {
    jest.mocked(sleep).mockClear();
  });

  it('returns the response when the task completes', async () => {
    const esClient = createMockEsClient([
      { completed: false },
      { completed: true, response: { total: 3 } },
    ]);

    const result = await pollTaskUntil({ esClient, taskId: TASK_ID, pollIntervalMs: 1 });

    expect(result).toEqual({ status: 'completed', response: { total: 3 } });
    expect(esClient.tasks.get).toHaveBeenCalledTimes(2);
  });

  it('doubles the wait between polls from the minimum up to the maximum', async () => {
    const esClient = createMockEsClient([
      { completed: false },
      { completed: false },
      { completed: false },
      { completed: false },
      { completed: true, response: { total: 3 } },
    ]);

    const result = await pollTaskUntil({
      esClient,
      taskId: TASK_ID,
      minPollIntervalMs: 5,
      pollIntervalMs: 12,
    });

    expect(result).toEqual({ status: 'completed', response: { total: 3 } });
    expect(jest.mocked(sleep).mock.calls.map(([ms]) => ms)).toEqual([5, 10, 12, 12]);
  });

  it('returns pending once the deadline passes', async () => {
    const esClient = createMockEsClient([{ completed: false }]);

    const result = await pollTaskUntil({
      esClient,
      taskId: TASK_ID,
      pollIntervalMs: 1,
      deadline: Date.now() - 1,
    });

    expect(result).toEqual({ status: 'pending' });
    expect(esClient.tasks.get).toHaveBeenCalledTimes(1);
  });

  it('returns missing when the task no longer exists', async () => {
    const esClient = createMockEsClient([]);
    jest.mocked(esClient.tasks.get).mockRejectedValueOnce(notFound);

    const result = await pollTaskUntil({ esClient, taskId: TASK_ID, pollIntervalMs: 1 });

    expect(result).toEqual({ status: 'missing' });
  });

  it('retries when reading the task fails', async () => {
    const esClient = createMockEsClient([]);
    jest
      .mocked(esClient.tasks.get)
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce({ completed: true, response: {} } as never);

    const result = await pollTaskUntil({ esClient, taskId: TASK_ID, pollIntervalMs: 1 });

    expect(result).toEqual({ status: 'completed', response: {} });
  });

  it('throws when the task reports an error', async () => {
    const esClient = createMockEsClient([{ completed: true, error: { reason: 'boom' } }]);

    await expect(pollTaskUntil({ esClient, taskId: TASK_ID, pollIntervalMs: 1 })).rejects.toThrow(
      `Task "${TASK_ID}" failed: boom`
    );
  });

  it('throws when the signal is aborted', async () => {
    const esClient = createMockEsClient([]);
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      pollTaskUntil({
        esClient,
        taskId: TASK_ID,
        pollIntervalMs: 1,
        signal: abortController.signal,
      })
    ).rejects.toThrow('Task polling aborted');
    expect(esClient.tasks.get).not.toHaveBeenCalled();
  });
});

describe('cancelTask', () => {
  const buildClient = (cancel: jest.Mock) =>
    ({ tasks: { cancel } } as unknown as jest.Mocked<ElasticsearchClient>);

  it('cancels the task', async () => {
    const cancel = jest.fn().mockResolvedValue({});

    await cancelTask({ esClient: buildClient(cancel), taskId: TASK_ID });

    expect(cancel).toHaveBeenCalledWith({ task_id: TASK_ID });
  });

  it('ignores a task that no longer exists', async () => {
    const logger = loggerMock.create();
    const cancel = jest
      .fn()
      .mockRejectedValue(Object.assign(new Error('Not Found'), { meta: { statusCode: 404 } }));

    await cancelTask({ esClient: buildClient(cancel), taskId: TASK_ID, logger });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs and does not throw on other errors', async () => {
    const logger = loggerMock.create();
    const cancel = jest.fn().mockRejectedValue(new Error('forbidden'));

    await cancelTask({ esClient: buildClient(cancel), taskId: TASK_ID, logger });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
  });
});
