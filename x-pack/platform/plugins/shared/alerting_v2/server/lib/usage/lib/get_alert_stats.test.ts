/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getAlertStats } from './get_alert_stats';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;

beforeEach(() => {
  jest.resetAllMocks();
});

function mockSearchResponse({
  total = 42,
  kindBuckets = [
    { key: 'active', doc_count: 30 },
    { key: 'recovered', doc_count: 12 },
  ],
  sourceBuckets = [
    { key: 'metrics', doc_count: 25 },
    { key: 'logs', doc_count: 17 },
  ],
  typeBuckets = [{ key: 'threshold', doc_count: 42 }],
  episodeCount = 10,
  minTimestamp = '2026-01-01T00:00:00.000Z',
}: {
  total?: number;
  kindBuckets?: Array<{ key: string; doc_count: number }>;
  sourceBuckets?: Array<{ key: string; doc_count: number }>;
  typeBuckets?: Array<{ key: string; doc_count: number }>;
  episodeCount?: number;
  minTimestamp?: string | null;
} = {}) {
  esClient.search.mockResponseOnce({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: { total: { value: total, relation: 'eq' }, max_score: null, hits: [] },
    aggregations: {
      count_by_kind: { buckets: kindBuckets },
      count_by_source: { buckets: sourceBuckets },
      count_by_type: { buckets: typeBuckets },
      episode_count: { value: episodeCount },
      min_timestamp: {
        value: minTimestamp ? Date.parse(minTimestamp) : null,
        value_as_string: minTimestamp ?? undefined,
      },
    },
  } as any);
}

describe('getAlertStats', () => {
  it('returns stats from aggregations', async () => {
    mockSearchResponse({});
    esClient.indices.stats.mockResponseOnce({
      _all: { total: { store: { size_in_bytes: 1024000 } } },
    } as any);

    const result = await getAlertStats(esClient);

    expect(result).toEqual({
      alerts_count: 42,
      alerts_count_by_kind: { active: 30, recovered: 12 },
      alerts_count_by_source: [
        {
          name: 'metrics',
          value: 25,
        },
        {
          name: 'logs',
          value: 17,
        },
      ],

      alerts_count_by_type: { threshold: 42 },
      alerts_episode_count: 10,
      alerts_min_timestamp: '2026-01-01T00:00:00.000Z',
      alerts_index_size_bytes: 1024000,
    });
  });

  it('returns null for alerts_index_size_bytes when indices.stats fails', async () => {
    mockSearchResponse({});
    esClient.indices.stats.mockRejectedValueOnce(new Error('index not found'));

    const result = await getAlertStats(esClient);

    expect(result.alerts_index_size_bytes).toBeNull();
  });

  it('returns null for alerts_min_timestamp when no documents exist', async () => {
    mockSearchResponse({
      total: 0,
      kindBuckets: [],
      sourceBuckets: [],
      typeBuckets: [],
      episodeCount: 0,
      minTimestamp: null,
    });
    esClient.indices.stats.mockResponseOnce({
      _all: { total: { store: { size_in_bytes: 0 } } },
    } as any);

    const result = await getAlertStats(esClient);

    expect(result).toEqual({
      alerts_count: 0,
      alerts_count_by_kind: {},
      alerts_count_by_source: [],
      alerts_count_by_type: {},
      alerts_episode_count: 0,
      alerts_min_timestamp: null,
      alerts_index_size_bytes: 0,
    });
  });

  it('returns defaults when aggregations are undefined', async () => {
    esClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    } as any);
    esClient.indices.stats.mockResponseOnce({ _all: {} } as any);

    const result = await getAlertStats(esClient);

    expect(result).toEqual({
      alerts_count: 0,
      alerts_count_by_kind: {},
      alerts_count_by_source: [],
      alerts_count_by_type: {},
      alerts_episode_count: 0,
      alerts_min_timestamp: null,
      alerts_index_size_bytes: null,
    });
  });

  it('handles numeric hits.total format', async () => {
    esClient.search.mockResponseOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: 5, max_score: null, hits: [] },
      aggregations: {
        count_by_kind: { buckets: [] },
        count_by_source: { buckets: [] },
        count_by_type: { buckets: [] },
        episode_count: { value: 2 },
        min_timestamp: { value: null },
      },
    } as any);
    esClient.indices.stats.mockResponseOnce({ _all: {} } as any);

    const result = await getAlertStats(esClient);

    expect(result.alerts_count).toBe(5);
  });
});
