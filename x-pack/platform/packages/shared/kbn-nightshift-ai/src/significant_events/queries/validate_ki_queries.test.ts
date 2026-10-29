/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Feature } from '@kbn/significant-events-schema';
import {
  computeValidationLookback,
  validateKIQueries,
  type CandidateKIQuery,
} from './validate_ki_queries';

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

describe('validateKIQueries full-text argument gate', () => {
  const features = [{ id: 'feature-1', run_id: 'run-1' } as Feature];
  const context = {
    targetSources: ['logs-test'],
    validationLookback: 'now-10m',
    conflictingFields: new Set<string>(),
    normalizedStoredEsqls: new Set<string>(),
  };

  const candidate = (where: string): CandidateKIQuery => ({
    title: 'Kafka timeouts',
    description: 'Upsert timeouts',
    category: 'error',
    severity_score: 60,
    feature_ids: ['feature-1'],
    esql: `FROM logs-test | WHERE ${where} | STATS metric_value = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)`,
  });

  const validate = (queries: CandidateKIQuery[]) => {
    const { esClient, query } = createEsClient();
    // The ES mock accepts everything, so any rejection below comes from the static gate.
    query.mockResolvedValue({ columns: [], values: [] });
    return {
      query,
      run: validateKIQueries({ queries, features, context, esClient, signal, logger }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a cast inside MATCH_PHRASE before reaching Elasticsearch', async () => {
    const { query, run } = validate([
      candidate('MATCH_PHRASE(exception.message::keyword, "i/o timeout")'),
    ]);
    const result = await run;

    expect(query).not.toHaveBeenCalled();
    expect(result.acceptedQueries).toEqual([]);
    expect(result.hasNonIntentFailures).toBe(true);
    expect(result.results[0]).toMatchObject({
      valid: false,
      status: 'Failed to add',
      failureReason: 'validation_error',
    });
    expect(result.results[0].error).toContain('MATCH_PHRASE(exception.message::KEYWORD, ...)');
  });

  it('accepts a bare-field MATCH_PHRASE', async () => {
    const { query, run } = validate([candidate('MATCH_PHRASE(exception.message, "i/o timeout")')]);
    const result = await run;

    expect(query).toHaveBeenCalledTimes(1);
    expect(result.acceptedQueries).toHaveLength(1);
    expect(result.hasNonIntentFailures).toBe(false);
  });

  it('accepts an exact comparison on a cast field', async () => {
    const { query, run } = validate([candidate('exception.message::keyword == "timeout"')]);
    const result = await run;

    expect(query).toHaveBeenCalledTimes(1);
    expect(result.acceptedQueries).toHaveLength(1);
    expect(result.results[0].valid).toBe(true);
  });

  it('accepts a LIKE on a cast field', async () => {
    const { run } = validate([candidate('exception.message::keyword LIKE "*i/o timeout*"')]);
    const result = await run;

    expect(result.acceptedQueries).toHaveLength(1);
  });
});
