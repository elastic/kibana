/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { PluginInitializerContext } from '@kbn/core/server';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { isRetryableError } from '@kbn/task-manager-plugin/server/task_running';
import type { PluginConfig } from '../../../config';
import { AlertActionsCleanupTaskRunner } from './task_runner';

const NOW = new Date('2026-10-15T12:00:00.000Z');

const createConfig = (dataRetention: string) =>
  ({
    get: jest
      .fn()
      .mockReturnValue({ retention: { alertActions: { dispatcher: { dataRetention } } } }),
  } as unknown as PluginInitializerContext<PluginConfig>['config']);

describe('AlertActionsCleanupTaskRunner', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  const createRunner = (dataRetention = '90d') =>
    new AlertActionsCleanupTaskRunner(esClient, createConfig(dataRetention));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deletes only dispatcher docs older than the configured retention', async () => {
    await createRunner('90d').run({ signal: new AbortController().signal });

    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ALERT_ACTIONS_DATA_STREAM,
        conflicts: 'proceed',
        query: {
          bool: {
            filter: [
              { terms: { action_type: ['fire', 'suppress', 'unmatched'] } },
              { range: { '@timestamp': { lt: '2026-07-17T12:00:00.000Z' } } },
            ],
          },
        },
      }),
      expect.anything()
    );
  });

  it('computes the cutoff from the configured retention', async () => {
    await createRunner('1d').run({ signal: new AbortController().signal });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: expect.arrayContaining([
              { range: { '@timestamp': { lt: '2026-10-14T12:00:00.000Z' } } },
            ]),
          },
        },
      }),
      expect.anything()
    );
  });

  it('does not fail when the data stream does not exist yet', async () => {
    await createRunner().run({ signal: new AbortController().signal });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ ignore_unavailable: true }),
      expect.anything()
    );
  });

  it('waits for the delete to finish', async () => {
    await createRunner().run({ signal: new AbortController().signal });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.not.objectContaining({ wait_for_completion: false }),
      expect.anything()
    );
  });

  it('passes the abort signal and a request timeout matching the task timeout', async () => {
    const { signal } = new AbortController();

    await createRunner().run({ signal });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(expect.anything(), {
      signal,
      requestTimeout: '5m',
    });
  });

  it('reschedules daily without state', async () => {
    const result = await createRunner().run({ signal: new AbortController().signal });

    expect(result).toEqual({ state: {}, schedule: { interval: '1d' } });
  });

  it('throws a retryable error when the delete fails', async () => {
    esClient.deleteByQuery.mockRejectedValueOnce(new Error('delete failed'));

    const error = await createRunner()
      .run({ signal: new AbortController().signal })
      .catch((e) => e);

    expect(error).toEqual(new Error('delete failed'));
    expect(isRetryableError(error)).toBe(true);
  });

  it('throws a retryable error when the run is aborted mid-request', async () => {
    const abortController = new AbortController();
    esClient.deleteByQuery.mockImplementationOnce(async (_request, options) => {
      abortController.abort();
      if (options?.signal?.aborted) {
        throw new Error('Request aborted');
      }
      return {};
    });

    const error = await createRunner()
      .run({ signal: abortController.signal })
      .catch((e) => e);

    expect(error).toEqual(new Error('Request aborted'));
    expect(isRetryableError(error)).toBe(true);
  });
});
