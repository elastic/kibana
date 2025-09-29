/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerStreamsUsageCollector } from './streams_usage_collector';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

const mockEsClient = elasticsearchServiceMock.createScopedClusterClient();
const esClient = mockEsClient.asInternalUser;

// Helper to create a valid SavedObjectsFindResult
const createFindResult = (attrs: any) => ({
  id: attrs.id || 'id',
  type: attrs.type || 'stream',
  version: attrs.version || '1',
  created_at: attrs.created_at || new Date().toISOString(),
  updated_at: attrs.updated_at || new Date().toISOString(),
  attributes: attrs.attributes,
  score: 1,
  references: [],
});

describe('Streams Usage Collector', () => {
  let usageCollectionMock: ReturnType<typeof usageCollectionPluginMock.createSetupContract>;

  beforeEach(() => {
    usageCollectionMock = usageCollectionPluginMock.createSetupContract();
    esClient.search.mockClear();
  });

  it('registers a streams collector', () => {
    const mockCoreSetup = {} as any;
    const mockPlugins = {} as any;
    registerStreamsUsageCollector(usageCollectionMock, mockCoreSetup, mockPlugins);
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'streams',
      })
    );
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  describe('fetch method', () => {
    it('returns default values when there is no data', async () => {
      const soClientMock = savedObjectsClientMock.create();
      soClientMock.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 0,
      });
      esClient.search.mockResolvedValue({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
        aggregations: {},
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      } as any);

      const mockCoreSetup = {} as any;
      const mockPlugins = {} as any;
      registerStreamsUsageCollector(usageCollectionMock, mockCoreSetup, mockPlugins);
      const fetch = usageCollectionMock.makeUsageCollector.mock.calls[0][0].fetch;
      const result = await fetch.call({}, { soClient: soClientMock, esClient });

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
          rule_execution_ms_avg: null,
          rule_execution_ms_p95: null,
          executions_count_24h: 0,
        },
      });
    });

    it('returns default values on client error', async () => {
      const soClientMock = savedObjectsClientMock.create();
      soClientMock.find.mockRejectedValue(new Error('SO error'));
      esClient.search.mockRejectedValue(new Error('ES error'));

      // Set NODE_ENV to production to avoid error throwing
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockCoreSetup = {} as any;
      const mockPlugins = {} as any;
      registerStreamsUsageCollector(usageCollectionMock, mockCoreSetup, mockPlugins);
      const fetch = usageCollectionMock.makeUsageCollector.mock.calls[0][0].fetch;
      const result = await fetch.call({}, { soClient: soClientMock, esClient });

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
          rule_execution_ms_avg: null,
          rule_execution_ms_p95: null,
          executions_count_24h: 0,
        },
      });
    });
    it('returns computed metrics when data is available', async () => {
      const soClientMock = savedObjectsClientMock.create();
      const now = new Date().toISOString();

      // Mock streams data - no SavedObjects queries for rules anymore
      soClientMock.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 0,
      });

      // Mock search calls - for streams, rules, significant events, and event log
      esClient.search.mockImplementation(async (params: any) => {
        if (params.index === '.kibana_streams') {
          return {
            hits: { hits: [], total: { value: 0, relation: 'eq' } },
          };
        }
        if (params.index === '.kibana*') {
          // Mock rules count
          return {
            hits: { total: { value: 5, relation: 'eq' } },
          };
        }
        if (params.index === '.alerts-streams.alerts-default') {
          return {
            hits: { total: { value: 123, relation: 'eq' } },
            aggregations: {
              by_stream_tags: {
                buckets: [
                  { key: 'logs.linux', doc_count: 50 },
                  { key: 'logs.windows', doc_count: 73 },
                ],
              },
            },
          };
        }
        if (params.index === '.kibana-event-log-*') {
          return {
            hits: {
              total: { value: 2, relation: 'eq' },
              hits: [
                { _source: { event: { duration: 1e6 } } }, // 1ms
                { _source: { event: { duration: 3e6 } } }, // 3ms
              ],
            },
          };
        }
        return { hits: { hits: [], total: { value: 0, relation: 'eq' } } };
      });

      const mockCoreSetup = {} as any;
      const mockPlugins = {} as any;
      registerStreamsUsageCollector(usageCollectionMock, mockCoreSetup, mockPlugins);
      const fetch = usageCollectionMock.makeUsageCollector.mock.calls[0][0].fetch;
      const result = await fetch.call({}, { soClient: soClientMock, esClient });

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
  });
});
