/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerStreamsUsageCollector } from './streams_usage_collector';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

const mockEsClient = elasticsearchServiceMock.createScopedClusterClient();
const esClient = mockEsClient.asInternalUser;

describe('Streams Usage Collector', () => {
  let usageCollectionMock: ReturnType<typeof usageCollectionPluginMock.createSetupContract>;

  beforeEach(() => {
    usageCollectionMock = usageCollectionPluginMock.createSetupContract();
    esClient.search.mockClear();
  });

  it('registers a streams collector', () => {
    registerStreamsUsageCollector(usageCollectionMock);
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'streams',
      })
    );
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  describe('fetch method', () => {
    it('returns default values when there is no data', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
        aggregations: {},
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      } as any);

      registerStreamsUsageCollector(usageCollectionMock);
      const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
      const result = await collector.fetch({ esClient });

      expect(result).toEqual({
        classic_streams: {
          changed_count: 0,
          with_processing_count: 0,
          with_fields_count: 0,
          with_changed_retention_count: 0,
        },
        wired_streams: {
          count: 0,
        },
        significant_events: {
          rules_count: 0,
          stored_count: 0,
          unique_wired_streams_count: 0,
          unique_classic_streams_count: 0,
          rule_execution_ms_avg_24h: null,
          rule_execution_ms_p95_24h: null,
          executions_count_24h: 0,
        },
      });
    });

    it('returns default values on client error', async () => {
      esClient.search.mockRejectedValue(new Error('ES error'));

      // Set NODE_ENV to production to avoid error throwing
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      registerStreamsUsageCollector(usageCollectionMock);
      const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
      const result = await collector.fetch({ esClient });

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;

      expect(result).toEqual({
        classic_streams: {
          changed_count: 0,
          with_processing_count: 0,
          with_fields_count: 0,
          with_changed_retention_count: 0,
        },
        wired_streams: {
          count: 0,
        },
        significant_events: {
          rules_count: 0,
          stored_count: 0,
          unique_wired_streams_count: 0,
          unique_classic_streams_count: 0,
          rule_execution_ms_avg_24h: null,
          rule_execution_ms_p95_24h: null,
          executions_count_24h: 0,
        },
      });
    });
    it('returns computed metrics when data is available', async () => {
      // Mock search calls - for streams, rules, significant events, and event log
      esClient.search.mockImplementation(async (params: any) => {
        const baseResponse = {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        };

        if (params.index === '.kibana_streams') {
          return {
            ...baseResponse,
            hits: { hits: [], total: { value: 0, relation: 'eq' } },
          } as any;
        }
        if (params.index === '.kibana*') {
          // Mock rules count
          return {
            ...baseResponse,
            hits: { hits: [], total: { value: 5, relation: 'eq' } },
          } as any;
        }
        if (params.index === '.alerts-streams.alerts-default') {
          return {
            ...baseResponse,
            hits: { hits: [], total: { value: 123, relation: 'eq' } },
            aggregations: {
              by_stream_tags: {
                buckets: [
                  { key: 'logs.linux', doc_count: 50 },
                  { key: 'logs.windows', doc_count: 73 },
                ],
              },
            },
          } as any;
        }
        if (params.index === '.kibana-event-log-*') {
          return {
            ...baseResponse,
            hits: {
              total: { value: 2, relation: 'eq' },
              hits: [
                { _source: { event: { duration: 1e6 } } }, // 1ms
                { _source: { event: { duration: 3e6 } } }, // 3ms
              ],
            },
          } as any;
        }
        return {
          ...baseResponse,
          hits: { hits: [], total: { value: 0, relation: 'eq' } },
        } as any;
      });

      registerStreamsUsageCollector(usageCollectionMock);
      const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
      const result = await collector.fetch({ esClient });

      expect(result).toEqual({
        classic_streams: {
          changed_count: 0, // No streams in .kibana_streams index in this test
          with_processing_count: 0,
          with_fields_count: 0,
          with_changed_retention_count: 0,
        },
        wired_streams: {
          count: 0,
        },
        significant_events: {
          rules_count: 5,
          stored_count: 123,
          unique_wired_streams_count: 0, // Mock doesn't have stream definitions
          unique_classic_streams_count: 0,
          rule_execution_ms_avg_24h: 2,
          rule_execution_ms_p95_24h: 2.9,
          executions_count_24h: 2,
        },
      });
    });

    it('handles circuit_breaking_exception gracefully', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();

      // Mock circuit breaker error
      esClientMock.search.mockRejectedValue({
        meta: {
          body: {
            error: {
              type: 'circuit_breaking_exception',
            },
          },
        },
        message: 'Circuit breaker error',
      });

      // Set production environment to prevent re-throwing
      process.env.NODE_ENV = 'production';

      registerStreamsUsageCollector(usageCollectionMock);
      const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
      const result = await collector.fetch({ esClient: esClientMock });

      // Should return default values when ES calls fail
      expect(result).toEqual({
        classic_streams: {
          changed_count: 0,
          with_processing_count: 0,
          with_fields_count: 0,
          with_changed_retention_count: 0,
        },
        wired_streams: {
          count: 0,
        },
        significant_events: {
          rules_count: 0,
          stored_count: 0,
          unique_wired_streams_count: 0,
          unique_classic_streams_count: 0,
          rule_execution_ms_avg_24h: null,
          rule_execution_ms_p95_24h: null,
          executions_count_24h: 0,
        },
      });
    });

    it('handles too_long_http_line_exception gracefully', async () => {
      const esClientMock2 = elasticsearchServiceMock.createElasticsearchClient();

      // Mock too long HTTP line error
      esClientMock2.search.mockRejectedValue({
        meta: {
          body: {
            error: {
              type: 'too_long_http_line_exception',
            },
          },
        },
        message: 'HTTP line too long',
      });

      // Set production environment to prevent re-throwing
      process.env.NODE_ENV = 'production';

      registerStreamsUsageCollector(usageCollectionMock);
      const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
      const result = await collector.fetch({ esClient: esClientMock2 });

      // Should return default values when ES calls fail
      expect(result).toEqual({
        classic_streams: {
          changed_count: 0,
          with_processing_count: 0,
          with_fields_count: 0,
          with_changed_retention_count: 0,
        },
        wired_streams: {
          count: 0,
        },
        significant_events: {
          rules_count: 0,
          stored_count: 0,
          unique_wired_streams_count: 0,
          unique_classic_streams_count: 0,
          rule_execution_ms_avg_24h: null,
          rule_execution_ms_p95_24h: null,
          executions_count_24h: 0,
        },
      });
    });
  });
});
