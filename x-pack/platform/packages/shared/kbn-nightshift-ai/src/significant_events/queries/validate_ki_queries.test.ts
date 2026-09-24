/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { computeValidationLookback } from './validate_ki_queries';

const createEsClient = () => {
  const query = jest.fn();

  return {
    esClient: { esql: { query } } as unknown as ElasticsearchClient,
    query,
  };
};

const logger = {
  debug: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
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

  it('probes the stream and keeps a narrow window when it is dense', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(100_000));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-a', 'logs-a.*'],
      signal,
      logger,
    });

    expect(query).toHaveBeenCalledWith(
      {
        query: 'FROM logs-a, logs-a.* | STATS total = COUNT(*)',
        filter: { range: { '@timestamp': { gte: 'now-10m', lte: 'now' } } },
      },
      { signal, requestTimeout: 5_000 }
    );
    expect(result).toBe('now-10m');
  });

  it('widens the window for a sparse stream', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce(countResponse(100));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-10000m');
  });

  it('uses the max window for an empty stream', async () => {
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

  it('falls back to the probe window when the probe fails', async () => {
    const { esClient, query } = createEsClient();
    query.mockRejectedValueOnce(new Error('Request timed out'));

    const result = await computeValidationLookback({
      esClient,
      sources: ['logs-*'],
      signal,
      logger,
    });

    expect(result).toBe('now-10m');
  });
});
