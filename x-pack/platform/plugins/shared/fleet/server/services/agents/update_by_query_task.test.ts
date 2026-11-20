/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { appContextService } from '../app_context';

import { updateByQueryAndWait } from './update_by_query_task';

jest.mock('../app_context', () => {
  const { loggerMock } = jest.requireActual('@kbn/logging-mocks');
  const logger = loggerMock.create();
  return {
    appContextService: {
      getLogger: () => logger,
    },
  };
});

const request = {
  index: '.fleet-agents',
  query: { terms: { _id: ['agent1', 'agent2'] } },
  conflicts: 'proceed' as const,
};

const fastOptions = { pollIntervalMs: 1, maxDurationMs: 5000 };

describe('updateByQueryAndWait', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createInternalClient();
    jest.mocked(appContextService.getLogger().warn).mockClear();
  });

  it('should start the update by query as a task instead of waiting for it in the request', async () => {
    esClient.updateByQuery.mockResolvedValue({ task: 'node1:42' } as any);
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: {},
      response: { total: 2, updated: 2, version_conflicts: 0, failures: [] },
    } as any);

    await updateByQueryAndWait(esClient, request, fastOptions);

    expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
    expect(esClient.updateByQuery).toHaveBeenCalledWith({
      ...request,
      wait_for_completion: false,
    });
  });

  it('should return the response of the finished task', async () => {
    esClient.updateByQuery.mockResolvedValue({ task: 'node1:42' } as any);
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: {},
      response: {
        total: 3,
        updated: 2,
        version_conflicts: 1,
        failures: [{ id: 'agent3', cause: { reason: 'error reason' } }],
      },
    } as any);

    const res = await updateByQueryAndWait(esClient, request, fastOptions);

    expect(esClient.tasks.get).toHaveBeenCalledWith({
      task_id: 'node1:42',
      wait_for_completion: false,
    });
    expect(res).toEqual({
      total: 3,
      updated: 2,
      version_conflicts: 1,
      failures: [{ id: 'agent3', cause: { reason: 'error reason' } }],
    });
    expect(appContextService.getLogger().warn).not.toHaveBeenCalled();
  });

  it('should keep polling until the task has finished', async () => {
    esClient.updateByQuery.mockResolvedValue({ task: 'node1:42' } as any);
    esClient.tasks.get
      .mockResolvedValueOnce({ completed: false, task: { status: { updated: 1 } } } as any)
      .mockResolvedValueOnce({ completed: false, task: { status: { updated: 1 } } } as any)
      .mockResolvedValueOnce({
        completed: true,
        task: {},
        response: { total: 2, updated: 2, version_conflicts: 0, failures: [] },
      } as any);

    const res = await updateByQueryAndWait(esClient, request, fastOptions);

    expect(esClient.tasks.get).toHaveBeenCalledTimes(3);
    expect(res.updated).toEqual(2);
  });

  it('should read the counters from the status of the task when it has no response', async () => {
    esClient.updateByQuery.mockResolvedValue({ task: 'node1:42' } as any);
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: { status: { total: 5, updated: 4, version_conflicts: 1, noops: 0 } },
    } as any);

    const res = await updateByQueryAndWait(esClient, request, fastOptions);

    expect(res).toEqual({ total: 5, updated: 4, version_conflicts: 1, failures: [] });
    expect(appContextService.getLogger().warn).toHaveBeenCalledWith(
      expect.stringContaining('Update by query task node1:42 finished without a response')
    );
  });

  it('should return a response that is not a task as is', async () => {
    esClient.updateByQuery.mockResolvedValue({ total: 2, updated: 2, failures: [] } as any);

    const res = await updateByQueryAndWait(esClient, request, fastOptions);

    expect(res).toEqual({ total: 2, updated: 2, failures: [] });
    expect(esClient.tasks.get).not.toHaveBeenCalled();
  });

  it('should throw if the task finished with an error', async () => {
    esClient.updateByQuery.mockResolvedValue({ task: 'node1:42' } as any);
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: {},
      error: { type: 'security_exception', reason: 'not allowed' },
    } as any);

    await expect(updateByQueryAndWait(esClient, request, fastOptions)).rejects.toThrow(
      /Update by query task node1:42 failed: .*security_exception/
    );
  });

  it('should not lose the result when reading the task times out once', async () => {
    esClient.updateByQuery.mockResolvedValue({ task: 'node1:42' } as any);
    esClient.tasks.get
      .mockRejectedValueOnce(new EsErrors.TimeoutError('Request timed out'))
      .mockResolvedValueOnce({
        completed: true,
        task: {},
        response: { total: 2, updated: 2, version_conflicts: 0, failures: [] },
      } as any);

    const res = await updateByQueryAndWait(esClient, request, fastOptions);

    expect(esClient.tasks.get).toHaveBeenCalledTimes(2);
    expect(res.updated).toEqual(2);
  }, 15000);

  it('should cancel the task and throw if it does not finish in time', async () => {
    esClient.updateByQuery.mockResolvedValue({ task: 'node1:42' } as any);
    esClient.tasks.get.mockResolvedValue({
      completed: false,
      task: { status: { total: 2, updated: 1 } },
    } as any);

    await expect(
      updateByQueryAndWait(esClient, request, { pollIntervalMs: 1, maxDurationMs: 20 })
    ).rejects.toThrow(/Update by query task node1:42 did not finish within 20ms/);

    expect(esClient.tasks.cancel).toHaveBeenCalledWith({ task_id: 'node1:42' });
  });

  it('should still throw if the task cannot be cancelled', async () => {
    esClient.updateByQuery.mockResolvedValue({ task: 'node1:42' } as any);
    esClient.tasks.get.mockResolvedValue({ completed: false, task: {} } as any);
    esClient.tasks.cancel.mockRejectedValue(new Error('cancel failed'));

    await expect(
      updateByQueryAndWait(esClient, request, { pollIntervalMs: 1, maxDurationMs: 20 })
    ).rejects.toThrow(/did not finish within 20ms/);
  });

  it('should throw if starting the update by query fails', async () => {
    esClient.updateByQuery.mockRejectedValue(new Error('start failed'));

    await expect(updateByQueryAndWait(esClient, request, fastOptions)).rejects.toThrow(
      'start failed'
    );
    expect(esClient.tasks.get).not.toHaveBeenCalled();
  });
});
