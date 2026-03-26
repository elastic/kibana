/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchIndexStats } from './index_stats_provider';

describe('fetchIndexStats', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('returns doc count, size, and freshness for each index', async () => {
    const now = 1_000_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const recentTimestamp = new Date(now - 30 * 60 * 1000).toISOString(); // 30 minutes ago → live

    esClient.indices.stats.mockResolvedValue({
      indices: {
        'logs-test-default': {
          primaries: {
            docs: { count: 500000, deleted: 0 },
            store: { size_in_bytes: 1073741824, reserved_in_bytes: 0 },
          },
        },
      },
    } as any);

    esClient.msearch.mockResolvedValue({
      responses: [
        {
          aggregations: {
            max_timestamp: {
              value: new Date(recentTimestamp).getTime(),
              value_as_string: recentTimestamp,
            },
          },
        },
      ],
    } as any);

    const result = await fetchIndexStats(esClient, ['logs-test-default']);

    expect(result.size).toBe(1);
    const stats = result.get('logs-test-default');
    expect(stats).toBeDefined();
    expect(stats?.doc_count).toBe(500000);
    expect(stats?.size_bytes).toBe(1073741824);
    expect(stats?.last_ingested_at).toBe(recentTimestamp);
    expect(stats?.is_active).toBe(true);
    expect(stats?.freshness_category).toBe('live');

    jest.restoreAllMocks();
  });

  it('handles indices with no timestamp', async () => {
    esClient.indices.stats.mockResolvedValue({
      indices: {
        'logs-empty-default': {
          primaries: {
            docs: { count: 0, deleted: 0 },
            store: { size_in_bytes: 0, reserved_in_bytes: 0 },
          },
        },
      },
    } as any);

    esClient.msearch.mockResolvedValue({
      responses: [
        {
          aggregations: {
            max_timestamp: {
              value: null,
              value_as_string: undefined,
            },
          },
        },
      ],
    } as any);

    const result = await fetchIndexStats(esClient, ['logs-empty-default']);

    expect(result.size).toBe(1);
    const stats = result.get('logs-empty-default');
    expect(stats).toBeDefined();
    expect(stats?.last_ingested_at).toBeNull();
    expect(stats?.is_active).toBe(false);
    expect(stats?.freshness_category).toBe('empty');
  });

  it('returns empty map for empty input', async () => {
    const result = await fetchIndexStats(esClient, []);

    expect(result.size).toBe(0);
    expect(esClient.indices.stats).not.toHaveBeenCalled();
    expect(esClient.msearch).not.toHaveBeenCalled();
  });
});
