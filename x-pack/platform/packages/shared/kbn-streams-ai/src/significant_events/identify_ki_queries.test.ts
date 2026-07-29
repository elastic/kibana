/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { computeValidationLookback } from './identify_ki_queries';

const createEsClient = () => {
  const query = jest.fn();

  return {
    esClient: { esql: { query } } as unknown as ElasticsearchClient,
    query,
  };
};

const logger = {
  debug: jest.fn(),
} as unknown as Logger;

const countResponse = (total: number) => ({
  columns: [{ name: 'total', type: 'long' }],
  values: [[total]],
});

const signal = new AbortController().signal;

describe('computeValidationLookback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('probes with a STATS COUNT(*) query scoped to the probe window', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(1_000_000));

    await computeValidationLookback({
      esClient,
      sources: ['$.cars.electric'],
      signal,
      logger,
    });

    expect(query).toHaveBeenCalledWith(
      {
        query: 'FROM $.cars.electric | STATS total = COUNT(*)',
        filter: {
          range: {
            '@timestamp': {
              gte: 'now-10m',
              lte: 'now',
            },
          },
        },
      },
      { signal, requestTimeout: 5_000 }
    );
  });

  it('joins multiple sources into a single FROM clause', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(0));

    await computeValidationLookback({
      esClient,
      sources: ['logs-a', 'logs-a.*'],
      signal,
      logger,
    });

    expect(query.mock.calls[0][0].query).toBe('FROM logs-a, logs-a.* | STATS total = COUNT(*)');
  });

  it('keeps a narrow window for a dense stream', async () => {
    const { esClient, query } = createEsClient();
    // 100k docs in the 10m probe window => rate already meets the target budget.
    query.mockResolvedValueOnce(countResponse(100_000));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-10m');
  });

  it('widens the window for a sparse stream', async () => {
    const { esClient, query } = createEsClient();
    // 100 docs / 10m => rate of 10/min; target of 100_000 docs needs 10_000 minutes.
    query.mockResolvedValueOnce(countResponse(100));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-10000m');
  });

  it('caps the widened window for a near-empty stream', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(0));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-10080m');
  });

  it('falls back to the probe window when the probe itself fails', async () => {
    const { esClient, query } = createEsClient();
    query.mockRejectedValueOnce(new Error('Request timed out'));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-10m');
    expect(logger.debug).toHaveBeenCalled();
  });
});
