/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getExecutionStats } from './get_execution_stats';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getExecutionStats', () => {
  it('returns stats from aggregations', async () => {
    esClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 150, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        count_by_status: {
          buckets: [
            { key: 'success', doc_count: 140 },
            { key: 'failure', doc_count: 10 },
          ],
        },
        delay_percentiles: {
          values: { '50.0': 100, '75.0': 250, '95.0': 1200, '99.0': 5000 },
        },
      },
    } as any);
    esClient.count.mockResponseOnce({ count: 48 } as any);

    const result = await getExecutionStats(esClient);

    expect(result).toEqual({
      executions_count_24hr: 150,
      executions_count_by_status_24hr: { success: 140, failure: 10 },
      executions_delay_p50_ms: 100,
      executions_delay_p75_ms: 250,
      executions_delay_p95_ms: 1200,
      executions_delay_p99_ms: 5000,
      dispatcher_executions_count_24hr: 48,
    });
  });

  it('returns defaults when aggregations are undefined', async () => {
    esClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    } as any);
    esClient.count.mockResponseOnce({ count: 0 } as any);

    const result = await getExecutionStats(esClient);

    expect(result).toEqual({
      executions_count_24hr: 0,
      executions_count_by_status_24hr: {},
      executions_delay_p50_ms: null,
      executions_delay_p75_ms: null,
      executions_delay_p95_ms: null,
      executions_delay_p99_ms: null,
      dispatcher_executions_count_24hr: 0,
    });
  });

  it('handles numeric hits.total format', async () => {
    esClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: 5, max_score: null, hits: [] },
      aggregations: {
        count_by_status: { buckets: [] },
        delay_percentiles: { values: {} },
      },
    } as any);
    esClient.count.mockResponseOnce({ count: 2 } as any);

    const result = await getExecutionStats(esClient);

    expect(result.executions_count_24hr).toBe(5);
    expect(result.dispatcher_executions_count_24hr).toBe(2);
  });
});
