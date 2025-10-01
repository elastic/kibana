/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerStreamsUsageCollector } from './streams_usage_collector';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { StreamsClient } from '../../streams/client';
import type { ResponseError } from '@elastic/transport/lib/errors';

const mockEsClient = elasticsearchServiceMock.createScopedClusterClient();
const esClient = mockEsClient.asInternalUser;
const mockLogger = loggingSystemMock.createLogger();
const mockGetStreamsClient = async () => {
  return {
    listStreams: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<StreamsClient>;
};

describe('Streams Usage Collector', () => {
  let usageCollectionMock: ReturnType<typeof usageCollectionPluginMock.createSetupContract>;

  beforeEach(() => {
    usageCollectionMock = usageCollectionPluginMock.createSetupContract();
    esClient.search.mockClear();
    mockLogger.error.mockClear();
  });

  it('registers a streams collector', () => {
    registerStreamsUsageCollector(usageCollectionMock, mockLogger, mockGetStreamsClient, false);
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
      } as SearchResponse);

      registerStreamsUsageCollector(usageCollectionMock, mockLogger, mockGetStreamsClient, false);
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
          unique_wired_streams_with_stored_count: 0,
          unique_classic_streams_with_stored_count: 0,
          rule_execution_ms_avg_24h: null,
          rule_execution_ms_p95_24h: null,
          executions_count_24h: 0,
        },
      });
    });

    it('throws error on client error and logs it', async () => {
      esClient.search.mockRejectedValue(new Error('ES error'));

      registerStreamsUsageCollector(usageCollectionMock, mockLogger, mockGetStreamsClient, false);
      const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;

      await expect(collector.fetch({ esClient })).rejects.toThrow('ES error');

      // Verify that logger.error was called with the correct message
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to collect Streams telemetry data',
        expect.any(Error)
      );
    });
    it('returns computed metrics when data is available', async () => {
      // Create a mock StreamsClient with test data
      const mockStreamsClientWithData = async () => {
        return {
          listStreams: jest.fn().mockResolvedValue([
            // Mock classic stream with processing and changed retention
            {
              name: 'logs.test',
              description: 'Test classic stream',
              ingest: {
                lifecycle: { data_retention: '7d' }, // Changed retention (not inherit)
                processing: {
                  steps: [{ dissect: { field: 'message', pattern: '%{field1} %{field2}' } }],
                },
                settings: {},
                classic: {
                  field_overrides: {
                    custom_field: { type: 'keyword' }, // Field overrides
                  },
                },
              },
            },
            // Mock wired stream
            {
              name: 'logs.wired',
              description: 'Test wired stream',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: {},
              },
            },
            // Mock stream that has both classic and wired properties (should be counted as wired)
            {
              name: 'logs.android',
              description: 'Test stream with both properties',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                classic: {}, // Has classic property
                wired: {}, // But also has wired property - should be counted as wired
              },
            },
          ]),
        } as unknown as jest.Mocked<StreamsClient>;
      };

      // Mock search calls - for rules, significant events, and event log (no longer need .kibana_streams)
      esClient.search.mockImplementation(async (params) => {
        const baseResponse = {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        };
        if (params?.index === '.kibana*') {
          // Mock rules count
          return {
            ...baseResponse,
            hits: { hits: [], total: { value: 5, relation: 'eq' } },
          } as SearchResponse;
        }
        if (params?.index === '.alerts-streams.alerts-*') {
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
          } as SearchResponse;
        }
        if (params?.index === '.kibana-event-log-*') {
          return {
            ...baseResponse,
            hits: {
              total: { value: 2, relation: 'eq' },
              hits: [
                { _source: { event: { duration: 1e6 } } }, // 1ms
                { _source: { event: { duration: 3e6 } } }, // 3ms
              ],
            },
          } as SearchResponse;
        }
        return {
          ...baseResponse,
          hits: { hits: [], total: { value: 0, relation: 'eq' } },
        } as SearchResponse;
      });

      registerStreamsUsageCollector(
        usageCollectionMock,
        mockLogger,
        mockStreamsClientWithData,
        false
      );
      const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;
      const result = await collector.fetch({ esClient });

      expect(result).toEqual({
        classic_streams: {
          changed_count: 1, // 1 classic stream from StreamsClient
          with_processing_count: 1, // 1 stream with dissect processing
          with_fields_count: 1, // 1 stream with field overrides
          with_changed_retention_count: 1, // 1 stream with changed retention
        },
        wired_streams: {
          count: 2, // 2 wired streams from StreamsClient (logs.wired + logs.android)
        },
        significant_events: {
          rules_count: 5,
          stored_count: 123,
          unique_wired_streams_with_stored_count: 0, // Mock doesn't have stream definitions
          unique_classic_streams_with_stored_count: 0,
          rule_execution_ms_avg_24h: 2,
          rule_execution_ms_p95_24h: 2.9,
          executions_count_24h: 2,
        },
      });
    });

    it('handles circuit_breaking_exception by throwing error and logging', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();

      // Mock circuit breaker error - create proper Error object
      const circuitBreakerError = new Error('Circuit breaker error') as ResponseError;
      circuitBreakerError.meta = {
        body: {
          error: {
            type: 'circuit_breaking_exception',
          },
        },
        statusCode: 429,
        headers: {},
        warnings: [],
        meta: {} as ResponseError['meta']['meta'],
      };
      esClientMock.search.mockRejectedValue(circuitBreakerError);

      registerStreamsUsageCollector(usageCollectionMock, mockLogger, mockGetStreamsClient, false);
      const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;

      await expect(collector.fetch({ esClient: esClientMock })).rejects.toThrow(
        'Circuit breaker error'
      );

      // Verify that logger.error was called instead of console.error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to collect Streams telemetry data',
        expect.any(Error)
      );
    });

    it('handles too_long_http_line_exception by throwing error and logging', async () => {
      const esClientMock2 = elasticsearchServiceMock.createElasticsearchClient();

      // Mock too long HTTP line error - create proper Error object
      const httpLineError = new Error('HTTP line too long') as ResponseError;
      httpLineError.meta = {
        body: {
          error: {
            type: 'too_long_http_line_exception',
          },
        },
        statusCode: 414,
        headers: {},
        warnings: [],
        meta: {} as ResponseError['meta']['meta'],
      };
      esClientMock2.search.mockRejectedValue(httpLineError);

      registerStreamsUsageCollector(usageCollectionMock, mockLogger, mockGetStreamsClient, false);
      const collector = usageCollectionMock.makeUsageCollector.mock.results[0].value;

      await expect(collector.fetch({ esClient: esClientMock2 })).rejects.toThrow(
        'HTTP line too long'
      );

      // Verify that logger.error was called instead of console.error
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to collect Streams telemetry data',
        expect.any(Error)
      );
    });
  });
});
