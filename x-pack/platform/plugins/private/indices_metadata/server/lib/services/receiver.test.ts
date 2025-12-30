/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { MetadataReceiver } from './receiver';

describe('Indices Metadata - MetadataReceiver', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let esClient: ElasticsearchClient;
  let receiver: MetadataReceiver;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = loggingSystemMock.createLogger();
    esClient = {
      indices: {
        get: jest.fn(),
        getDataStream: jest.fn(),
        stats: jest.fn(),
        getIndexTemplate: jest.fn(),
      },
      ilm: {
        explainLifecycle: jest.fn(),
        getLifecycle: jest.fn(),
      },
      transport: {
        request: jest.fn(),
      },
    } as unknown as ElasticsearchClient;

    receiver = new MetadataReceiver(logger, esClient, false);
  });

  describe('getIndices', () => {
    const mockIndicesResponse = {
      'test-index-1': {
        settings: {
          index: {
            default_pipeline: 'default',
            final_pipeline: 'final',
            mode: 'standard',
          },
        },
        mappings: {
          _source: {
            mode: 'stored',
          },
        },
      },
    };

    it('should successfully fetch indices', async () => {
      (esClient.indices.get as jest.Mock).mockResolvedValue(mockIndicesResponse);

      const result = await receiver.getIndices();

      expect(esClient.indices.get).toHaveBeenCalledWith({
        index: '*',
        expand_wildcards: ['open', 'hidden'],
        filter_path: [
          '*.mappings._source.mode',
          '*.settings.index.default_pipeline',
          '*.settings.index.final_pipeline',
          '*.settings.index.mode',
          '*.settings.index.provided_name',
        ],
      });

      expect(result).toEqual([
        {
          index_name: 'test-index-1',
          default_pipeline: 'default',
          final_pipeline: 'final',
          index_mode: 'standard',
          source_mode: 'stored',
        },
      ]);
    });

    it.each([
      { description: 'empty', mockValue: {} },
      { description: 'null', mockValue: null },
      { description: 'undefined', mockValue: undefined },
    ])('should handle $description indices response', async ({ mockValue }) => {
      (esClient.indices.get as jest.Mock).mockResolvedValue(mockValue);

      const result = await receiver.getIndices();

      expect(result).toEqual([]);
    });

    it('should handle errors and log warning', async () => {
      const error = new Error('Elasticsearch error');
      (esClient.indices.get as jest.Mock).mockRejectedValue(error);

      await expect(receiver.getIndices()).rejects.toThrow('Elasticsearch error');
      expect(logger.warn).toHaveBeenCalledWith('Error fetching indices', { error });
    });

    it('should handle indices with missing properties', async () => {
      const incompleteResponse = {
        'test-index-1': {
          settings: {},
          mappings: {},
        },
        'test-index-2': {},
      };

      (esClient.indices.get as jest.Mock).mockResolvedValue(incompleteResponse);

      const result = await receiver.getIndices();

      expect(result).toEqual([
        {
          index_name: 'test-index-1',
          default_pipeline: undefined,
          final_pipeline: undefined,
          index_mode: undefined,
          source_mode: undefined,
        },
        {
          index_name: 'test-index-2',
          default_pipeline: undefined,
          final_pipeline: undefined,
          index_mode: undefined,
          source_mode: undefined,
        },
      ]);
    });
  });

  describe('getDataStreams', () => {
    const mockDataStreamResponse = {
      data_streams: [
        {
          name: 'test-datastream',
          indices: [
            {
              index_name: 'test-index-1',
              ilm_policy: 'policy1',
            },
          ],
        },
      ],
    };

    it('should successfully fetch datastreams', async () => {
      (esClient.indices.getDataStream as jest.Mock).mockResolvedValue(mockDataStreamResponse);

      const result = await receiver.getDataStreams();

      expect(esClient.indices.getDataStream).toHaveBeenCalledWith({
        name: '*',
        expand_wildcards: ['open', 'hidden'],
        filter_path: [
          'data_streams.name',
          'data_streams.indices',
          'data_streams.lifecycle.enabled',
          'data_streams.lifecycle.data_retention',
        ],
      });

      expect(result).toEqual([
        {
          datastream_name: 'test-datastream',
          dsl: {
            enabled: false,
            data_retention: undefined,
          },
          indices: [
            {
              index_name: 'test-index-1',
              ilm_policy: 'policy1',
            },
          ],
        },
      ]);
    });

    it.each([
      { description: 'empty data_streams', mockValue: { data_streams: [] } },
      { description: 'null data_streams', mockValue: { data_streams: null } },
      { description: 'undefined data_streams', mockValue: { data_streams: undefined } },
      { description: 'missing data_streams property', mockValue: {} },
    ])('should handle $description response', async ({ mockValue }) => {
      (esClient.indices.getDataStream as jest.Mock).mockResolvedValue(mockValue);

      const result = await receiver.getDataStreams();

      expect(result).toEqual([]);
    });

    it('should handle datastreams with missing indices', async () => {
      const responseWithoutIndices = {
        data_streams: [
          {
            name: 'test-datastream',
          },
        ],
      };

      (esClient.indices.getDataStream as jest.Mock).mockResolvedValue(responseWithoutIndices);

      const result = await receiver.getDataStreams();

      expect(result).toEqual([
        {
          datastream_name: 'test-datastream',
          dsl: {
            enabled: false,
            data_retention: undefined,
          },
          indices: [],
        },
      ]);
    });

    it('should handle errors and log error', async () => {
      const error = new Error('Elasticsearch error');
      (esClient.indices.getDataStream as jest.Mock).mockRejectedValue(error);

      await expect(receiver.getDataStreams()).rejects.toThrow('Elasticsearch error');
      expect(logger.error).toHaveBeenCalledWith('Error fetching datastreams', { error });
    });

    it.each([
      { description: '7 days', retention: '7d' },
      { description: '30 days', retention: '30d' },
      { description: '90 days', retention: '90d' },
      { description: '365 days', retention: '365d' },
      { description: '1 year', retention: '1y' },
    ])('should handle DSL enabled with retention: $description', async ({ retention }) => {
      const mockResponse = {
        data_streams: [
          {
            name: 'logs-test',
            lifecycle: {
              enabled: true,
              data_retention: retention,
            },
            indices: [
              {
                index_name: '.ds-logs-test-000001',
              },
            ],
          },
        ],
      };

      (esClient.indices.getDataStream as jest.Mock).mockResolvedValue(mockResponse);

      const result = await receiver.getDataStreams();

      expect(result).toEqual([
        {
          datastream_name: 'logs-test',
          dsl: {
            enabled: true,
            data_retention: retention,
          },
          indices: [
            {
              index_name: '.ds-logs-test-000001',
              ilm_policy: undefined,
            },
          ],
        },
      ]);
    });

    it('should handle DSL enabled without retention period', async () => {
      const mockResponse = {
        data_streams: [
          {
            name: 'logs-test',
            lifecycle: {
              enabled: true,
            },
            indices: [
              {
                index_name: '.ds-logs-test-000001',
              },
            ],
          },
        ],
      };

      (esClient.indices.getDataStream as jest.Mock).mockResolvedValue(mockResponse);

      const result = await receiver.getDataStreams();

      expect(result).toEqual([
        {
          datastream_name: 'logs-test',
          dsl: {
            enabled: true,
            data_retention: undefined,
          },
          indices: [
            {
              index_name: '.ds-logs-test-000001',
              ilm_policy: undefined,
            },
          ],
        },
      ]);
    });

    it('should handle multiple datastreams with different DSL configurations', async () => {
      const mockResponse = {
        data_streams: [
          {
            name: 'logs-enabled-with-retention',
            lifecycle: {
              enabled: true,
              data_retention: '30d',
            },
            indices: [{ index_name: '.ds-logs-1-000001' }],
          },
          {
            name: 'logs-enabled-no-retention',
            lifecycle: {
              enabled: true,
            },
            indices: [{ index_name: '.ds-logs-2-000001' }],
          },
          {
            name: 'logs-disabled-no-lifecycle',
            indices: [{ index_name: '.ds-logs-3-000001' }],
          },
          {
            name: 'logs-disabled-with-retention',
            lifecycle: {
              enabled: false,
              data_retention: '7d',
            },
            indices: [{ index_name: '.ds-logs-4-000001' }],
          },
        ],
      };

      (esClient.indices.getDataStream as jest.Mock).mockResolvedValue(mockResponse);

      const result = await receiver.getDataStreams();

      expect(result).toHaveLength(4);
      expect(result).toEqual([
        {
          datastream_name: 'logs-enabled-with-retention',
          dsl: { enabled: true, data_retention: '30d' },
          indices: [{ index_name: '.ds-logs-1-000001', ilm_policy: undefined }],
        },
        {
          datastream_name: 'logs-enabled-no-retention',
          dsl: { enabled: true, data_retention: undefined },
          indices: [{ index_name: '.ds-logs-2-000001', ilm_policy: undefined }],
        },
        {
          datastream_name: 'logs-disabled-no-lifecycle',
          dsl: { enabled: false, data_retention: undefined },
          indices: [{ index_name: '.ds-logs-3-000001', ilm_policy: undefined }],
        },
        {
          datastream_name: 'logs-disabled-with-retention',
          dsl: { enabled: false, data_retention: '7d' },
          indices: [{ index_name: '.ds-logs-4-000001', ilm_policy: undefined }],
        },
      ]);
    });

    it('should handle null lifecycle object', async () => {
      const mockResponse = {
        data_streams: [
          {
            name: 'logs-null-lifecycle',
            lifecycle: null,
            indices: [{ index_name: '.ds-logs-000001' }],
          },
        ],
      };

      (esClient.indices.getDataStream as jest.Mock).mockResolvedValue(mockResponse);

      const result = await receiver.getDataStreams();

      expect(result).toEqual([
        {
          datastream_name: 'logs-null-lifecycle',
          dsl: {
            enabled: false,
            data_retention: undefined,
          },
          indices: [{ index_name: '.ds-logs-000001', ilm_policy: undefined }],
        },
      ]);
    });

    it('should handle null data_retention value', async () => {
      const mockResponse = {
        data_streams: [
          {
            name: 'logs-null-retention',
            lifecycle: {
              enabled: true,
              data_retention: null,
            },
            indices: [{ index_name: '.ds-logs-000001' }],
          },
        ],
      };

      (esClient.indices.getDataStream as jest.Mock).mockResolvedValue(mockResponse);

      const result = await receiver.getDataStreams();

      expect(result).toEqual([
        {
          datastream_name: 'logs-null-retention',
          dsl: {
            enabled: true,
            data_retention: null,
          },
          indices: [{ index_name: '.ds-logs-000001', ilm_policy: undefined }],
        },
      ]);
    });

    it.each([
      { description: 'hours', retention: '24h' },
      { description: 'minutes', retention: '1440m' },
      { description: 'mixed case', retention: '30D' },
      { description: 'with spaces', retention: '7 d' },
      { description: 'empty string', retention: '' },
    ])('should preserve retention format as-is: $description', async ({ retention }) => {
      const mockResponse = {
        data_streams: [
          {
            name: 'logs-format-test',
            lifecycle: {
              enabled: true,
              data_retention: retention,
            },
            indices: [],
          },
        ],
      };

      (esClient.indices.getDataStream as jest.Mock).mockResolvedValue(mockResponse);

      const result = await receiver.getDataStreams();

      expect(result[0].dsl?.data_retention).toBe(retention);
    });

    it('should handle datastreams with both DSL and ILM policy', async () => {
      const mockResponse = {
        data_streams: [
          {
            name: 'logs-both-dsl-ilm',
            lifecycle: {
              enabled: true,
              data_retention: '30d',
            },
            indices: [
              {
                index_name: '.ds-logs-000001',
                ilm_policy: 'logs-policy',
              },
            ],
          },
        ],
      };

      (esClient.indices.getDataStream as jest.Mock).mockResolvedValue(mockResponse);

      const result = await receiver.getDataStreams();

      expect(result).toEqual([
        {
          datastream_name: 'logs-both-dsl-ilm',
          dsl: {
            enabled: true,
            data_retention: '30d',
          },
          indices: [
            {
              index_name: '.ds-logs-000001',
              ilm_policy: 'logs-policy',
            },
          ],
        },
      ]);
    });
  });

  describe('getIndexTemplatesStats', () => {
    const mockTemplateResponse = {
      index_templates: [
        {
          name: 'test-template',
          index_template: {
            template: {
              settings: {
                index: {
                  mode: 'standard',
                },
              },
              mappings: {
                _source: {
                  enabled: true,
                  includes: ['field1'],
                  excludes: ['field2'],
                },
              },
            },
            _meta: {
              package: {
                name: 'test-package',
              },
              managed_by: 'elasticsearch',
              beat: 'filebeat',
              managed: true,
            },
            data_stream: {},
            composed_of: ['component1'],
          },
        },
      ],
    };

    it('should successfully fetch index templates', async () => {
      (esClient.indices.getIndexTemplate as jest.Mock).mockResolvedValue(mockTemplateResponse);

      const result = await receiver.getIndexTemplatesStats();

      expect(esClient.indices.getIndexTemplate).toHaveBeenCalledWith({
        name: '*',
        filter_path: [
          'index_templates.name',
          'index_templates.index_template.template.settings.index.mode',
          'index_templates.index_template.data_stream',
          'index_templates.index_template._meta.package.name',
          'index_templates.index_template._meta.managed_by',
          'index_templates.index_template._meta.beat',
          'index_templates.index_template._meta.managed',
          'index_templates.index_template.composed_of',
          'index_templates.index_template.template.mappings._source.enabled',
          'index_templates.index_template.template.mappings._source.includes',
          'index_templates.index_template.template.mappings._source.excludes',
        ],
      });

      expect(result).toEqual([
        {
          template_name: 'test-template',
          index_mode: 'standard',
          package_name: 'test-package',
          datastream: true,
          managed_by: 'elasticsearch',
          beat: 'filebeat',
          is_managed: true,
          composed_of: ['component1'],
          source_enabled: true,
          source_includes: ['field1'],
          source_excludes: ['field2'],
        },
      ]);
    });

    it.each([
      { description: 'empty', mockValue: { index_templates: [] } },
      { description: 'null', mockValue: { index_templates: null } },
      { description: 'undefined', mockValue: { index_templates: undefined } },
    ])('should handle $description index_templates response', async ({ mockValue }) => {
      (esClient.indices.getIndexTemplate as jest.Mock).mockResolvedValue(mockValue);

      const result = await receiver.getIndexTemplatesStats();

      expect(result).toEqual([]);
    });

    it('should handle templates without data_stream property', async () => {
      const templateWithoutDataStream = {
        index_templates: [
          {
            name: 'test-template',
            index_template: {
              template: {},
              _meta: {},
              composed_of: [],
            },
          },
        ],
      };

      (esClient.indices.getIndexTemplate as jest.Mock).mockResolvedValue(templateWithoutDataStream);

      const result = await receiver.getIndexTemplatesStats();

      expect(result).toEqual([
        {
          template_name: 'test-template',
          index_mode: undefined,
          package_name: undefined,
          datastream: false,
          managed_by: undefined,
          beat: undefined,
          is_managed: undefined,
          composed_of: [],
          source_enabled: undefined,
          source_includes: [],
          source_excludes: [],
        },
      ]);
    });

    it('should handle errors and log warning', async () => {
      const error = new Error('Elasticsearch error');
      (esClient.indices.getIndexTemplate as jest.Mock).mockRejectedValue(error);

      await expect(receiver.getIndexTemplatesStats()).rejects.toThrow('Elasticsearch error');
      expect(logger.warn).toHaveBeenCalledWith('Error fetching index templates', { error });
    });
  });

  describe('getIndicesStats', () => {
    const mockStatsResponse = {
      indices: {
        'test-index-1': {
          total: {
            search: {
              query_total: 100,
              query_time_in_millis: 1000,
            },
            docs: {
              count: 500,
              deleted: 10,
            },
            store: {
              size_in_bytes: 1024000,
            },
            indexing: {
              index_failed: 5,
              index_failed_due_to_version_conflict: 2,
            },
          },
          primaries: {
            docs: {
              count: 250,
              deleted: 5,
            },
            store: {
              size_in_bytes: 512000,
            },
          },
        },
      },
    };

    it('should successfully fetch indices stats', async () => {
      (esClient.indices.stats as jest.Mock).mockResolvedValue(mockStatsResponse);

      const results = [];
      for await (const stat of receiver.getIndicesStats(['test-index-1'], 10)) {
        results.push(stat);
      }

      expect(esClient.indices.stats).toHaveBeenCalledWith({
        index: ['test-index-1'],
        level: 'indices',
        metric: ['docs', 'search', 'store'],
        expand_wildcards: ['open', 'hidden'],
        filter_path: [
          'indices.*.total.search.query_total',
          'indices.*.total.search.query_time_in_millis',

          'indices.*.total.docs.count',
          'indices.*.total.docs.deleted',
          'indices.*.total.store.size_in_bytes',

          'indices.*.primaries.docs.count',
          'indices.*.primaries.docs.deleted',
          'indices.*.primaries.store.size_in_bytes',

          'indices.*.total.indexing.index_failed',
          'indices.*.total.indexing.index_failed_due_to_version_conflict',
        ],
      });

      expect(results).toEqual([
        {
          index_name: 'test-index-1',
          query_total: 100,
          query_time_in_millis: 1000,
          docs_count: 250,
          docs_deleted: 10,
          docs_total_size_in_bytes: 512000,
          index_failed: 5,
          index_failed_due_to_version_conflict: 2,
          docs_count_primaries: 250,
          docs_deleted_primaries: 5,
          docs_total_size_in_bytes_primaries: 512000,
        },
      ]);
    });

    it.each([
      { description: 'empty', mockValue: { indices: {} } },
      { description: 'null', mockValue: { indices: null } },
      { description: 'undefined', mockValue: { indices: undefined } },
    ])('should handle $description indices response', async ({ mockValue }) => {
      (esClient.indices.stats as jest.Mock).mockResolvedValue(mockValue);

      const results = [];
      for await (const stat of receiver.getIndicesStats(['test-index-1'], 10)) {
        results.push(stat);
      }

      expect(results).toEqual([]);
    });

    it('should handle chunk size limits', async () => {
      (esClient.indices.stats as jest.Mock).mockResolvedValue(mockStatsResponse);

      const results = [];
      for await (const stat of receiver.getIndicesStats(['test-index-1'], 5000)) {
        results.push(stat);
      }

      expect(esClient.indices.stats).toHaveBeenCalledWith(
        expect.objectContaining({
          index: ['test-index-1'],
        })
      );
    });

    it('should handle errors and log error', async () => {
      const error = new Error('Elasticsearch error');
      (esClient.indices.stats as jest.Mock).mockRejectedValue(error);

      const iterator = receiver.getIndicesStats(['test-index-1'], 10);
      await expect(iterator.next()).rejects.toThrow('Elasticsearch error');
      expect(logger.error).toHaveBeenCalledWith('Error fetching indices stats', { error });
    });

    it('should handle response with missing primaries data', async () => {
      const mockResponseWithoutPrimaries = {
        indices: {
          'test-index-1': {
            total: {
              search: {
                query_total: 100,
                query_time_in_millis: 1000,
              },
              docs: {
                count: 500,
                deleted: 10,
              },
              store: {
                size_in_bytes: 1024000,
              },
              indexing: {
                index_failed: 5,
                index_failed_due_to_version_conflict: 2,
              },
            },
          },
        },
      };

      (esClient.indices.stats as jest.Mock).mockResolvedValue(mockResponseWithoutPrimaries);

      const results = [];
      for await (const stat of receiver.getIndicesStats(['test-index-1'], 10)) {
        results.push(stat);
      }

      expect(results).toEqual([
        {
          index_name: 'test-index-1',
          query_total: 100,
          query_time_in_millis: 1000,
          docs_count: undefined,
          docs_deleted: 10,
          docs_total_size_in_bytes: undefined,
          index_failed: 5,
          index_failed_due_to_version_conflict: 2,
          docs_count_primaries: undefined,
          docs_deleted_primaries: undefined,
          docs_total_size_in_bytes_primaries: undefined,
        },
      ]);
    });

    it('should handle response with missing indexing failure data', async () => {
      const mockResponseWithoutIndexingFailures = {
        indices: {
          'test-index-1': {
            total: {
              search: {
                query_total: 100,
                query_time_in_millis: 1000,
              },
              docs: {
                count: 500,
                deleted: 10,
              },
              store: {
                size_in_bytes: 1024000,
              },
            },
            primaries: {
              docs: {
                count: 250,
                deleted: 5,
              },
              store: {
                size_in_bytes: 512000,
              },
            },
          },
        },
      };

      (esClient.indices.stats as jest.Mock).mockResolvedValue(mockResponseWithoutIndexingFailures);

      const results = [];
      for await (const stat of receiver.getIndicesStats(['test-index-1'], 10)) {
        results.push(stat);
      }

      expect(results).toEqual([
        {
          index_name: 'test-index-1',
          query_total: 100,
          query_time_in_millis: 1000,
          docs_count: 250,
          docs_deleted: 10,
          docs_total_size_in_bytes: 512000,
          index_failed: undefined,
          index_failed_due_to_version_conflict: undefined,
          docs_count_primaries: 250,
          docs_deleted_primaries: 5,
          docs_total_size_in_bytes_primaries: 512000,
        },
      ]);
    });

    it('should continue processing when receiver methods return empty results', async () => {
      const mockResponseMinimalData = {
        indices: {
          'test-index-1': {
            total: {},
            primaries: {},
          },
        },
      };

      (esClient.indices.stats as jest.Mock).mockResolvedValue(mockResponseMinimalData);

      const results = [];
      for await (const stat of receiver.getIndicesStats(['test-index-1'], 10)) {
        results.push(stat);
      }

      expect(results).toEqual([
        {
          index_name: 'test-index-1',
          query_total: undefined,
          query_time_in_millis: undefined,
          docs_count: undefined,
          docs_deleted: undefined,
          docs_total_size_in_bytes: undefined,
          index_failed: undefined,
          index_failed_due_to_version_conflict: undefined,
          docs_count_primaries: undefined,
          docs_deleted_primaries: undefined,
          docs_total_size_in_bytes_primaries: undefined,
        },
      ]);
    });

    describe('with metering stats', () => {
      describe('serverless mode', () => {
        let serverlessReceiver: MetadataReceiver;

        beforeEach(() => {
          serverlessReceiver = new MetadataReceiver(logger, esClient, true);
        });

        it.each([
          {
            description: 'metering data matches primaries',
            meteringResponse: {
              indices: [
                {
                  name: 'test-index-1',
                  num_docs: 250,
                  size_in_bytes: 512000,
                },
              ],
            },
            expectError: false,
          },
          {
            description: 'metering stats fetch fails',
            meteringResponse: new Error('Metering API error'),
            expectError: true,
          },
          {
            description: 'metering stats are empty',
            meteringResponse: {
              indices: [],
            },
            expectError: false,
          },
        ])(
          'should not log debug message when $description',
          async ({ meteringResponse, expectError }) => {
            (esClient.indices.stats as jest.Mock).mockResolvedValue(mockStatsResponse);

            if (meteringResponse instanceof Error) {
              (esClient.transport.request as jest.Mock).mockRejectedValue(meteringResponse);
            } else {
              (esClient.transport.request as jest.Mock).mockResolvedValue(meteringResponse);
            }

            const results = [];
            for await (const stat of serverlessReceiver.getIndicesStats(['test-index-1'], 10)) {
              results.push(stat);
            }

            expect(esClient.transport.request).toHaveBeenCalledWith({
              method: 'GET',
              path: '/_metering/stats/test-index-1',
            });

            if (expectError) {
              expect(logger.error).toHaveBeenCalledWith('Error fetching metering stats', {
                error: meteringResponse,
              });
            }

            expect(results).toEqual([
              {
                index_name: 'test-index-1',
                query_total: 100,
                query_time_in_millis: 1000,
                docs_count: 250,
                docs_deleted: 10,
                docs_total_size_in_bytes: 512000,
                index_failed: 5,
                index_failed_due_to_version_conflict: 2,
                docs_count_primaries: 250,
                docs_deleted_primaries: 5,
                docs_total_size_in_bytes_primaries: 512000,
              },
            ]);

            expect(logger.debug).not.toHaveBeenCalledWith(
              'Metering stats differ from regular stats',
              expect.any(Object)
            );
          }
        );

        it('should log debug message when metering stats differ from regular stats', async () => {
          const mockMeteringResponse = {
            indices: [
              {
                name: 'test-index-1',
                num_docs: 300,
                size_in_bytes: 600000,
              },
            ],
          };

          (esClient.indices.stats as jest.Mock).mockResolvedValue(mockStatsResponse);
          (esClient.transport.request as jest.Mock).mockResolvedValue(mockMeteringResponse);

          const results = [];
          for await (const stat of serverlessReceiver.getIndicesStats(['test-index-1'], 10)) {
            results.push(stat);
          }

          expect(results).toEqual([
            {
              index_name: 'test-index-1',
              query_total: 100,
              query_time_in_millis: 1000,
              docs_count: 300,
              docs_deleted: 10,
              docs_total_size_in_bytes: 600000,
              index_failed: 5,
              index_failed_due_to_version_conflict: 2,
              docs_count_primaries: 300,
              docs_deleted_primaries: 5,
              docs_total_size_in_bytes_primaries: 600000,
            },
          ]);

          expect(logger.debug).toHaveBeenCalledWith('Metering stats differ from regular stats', {
            index: 'test-index-1',
            metering: { num_docs: 300, size_in_bytes: 600000 },
            regular: { docs_count: 250, size_in_bytes: 512000 },
          });
        });

        it('should handle partial metering stats', async () => {
          const mockMultiIndexStatsResponse = {
            indices: {
              'test-index-1': mockStatsResponse.indices['test-index-1'],
              'test-index-2': {
                total: {
                  search: {
                    query_total: 200,
                    query_time_in_millis: 2000,
                  },
                  docs: {
                    count: 1000,
                    deleted: 20,
                  },
                  store: {
                    size_in_bytes: 2048000,
                  },
                  indexing: {
                    index_failed: 10,
                    index_failed_due_to_version_conflict: 4,
                  },
                },
                primaries: {
                  docs: {
                    count: 500,
                    deleted: 10,
                  },
                  store: {
                    size_in_bytes: 1024000,
                  },
                },
              },
            },
          };

          const mockMeteringResponse = {
            indices: [
              {
                name: 'test-index-1',
                num_docs: 300,
                size_in_bytes: 600000,
              },
            ],
          };

          (esClient.indices.stats as jest.Mock).mockResolvedValue(mockMultiIndexStatsResponse);
          (esClient.transport.request as jest.Mock).mockResolvedValue(mockMeteringResponse);

          const results = [];
          for await (const stat of serverlessReceiver.getIndicesStats(
            ['test-index-1', 'test-index-2'],
            100
          )) {
            results.push(stat);
          }

          expect(results).toEqual([
            {
              index_name: 'test-index-1',
              query_total: 100,
              query_time_in_millis: 1000,
              docs_count: 300,
              docs_deleted: 10,
              docs_total_size_in_bytes: 600000,
              index_failed: 5,
              index_failed_due_to_version_conflict: 2,
              docs_count_primaries: 300,
              docs_deleted_primaries: 5,
              docs_total_size_in_bytes_primaries: 600000,
            },
            {
              index_name: 'test-index-2',
              query_total: 200,
              query_time_in_millis: 2000,
              docs_count: 500,
              docs_deleted: 20,
              docs_total_size_in_bytes: 1024000,
              index_failed: 10,
              index_failed_due_to_version_conflict: 4,
              docs_count_primaries: 500,
              docs_deleted_primaries: 10,
              docs_total_size_in_bytes_primaries: 1024000,
            },
          ]);
        });
      });

      describe('non-serverless mode', () => {
        it('should not call metering API', async () => {
          (esClient.indices.stats as jest.Mock).mockResolvedValue(mockStatsResponse);

          const results = [];
          for await (const stat of receiver.getIndicesStats(['test-index-1'], 10)) {
            results.push(stat);
          }

          expect(esClient.transport.request).not.toHaveBeenCalled();

          expect(results).toEqual([
            {
              index_name: 'test-index-1',
              query_total: 100,
              query_time_in_millis: 1000,
              docs_count: 250,
              docs_deleted: 10,
              docs_total_size_in_bytes: 512000,
              index_failed: 5,
              index_failed_due_to_version_conflict: 2,
              docs_count_primaries: 250,
              docs_deleted_primaries: 5,
              docs_total_size_in_bytes_primaries: 512000,
            },
          ]);
        });
      });
    });
  });

  describe('isIlmStatsAvailable', () => {
    it('should return true when ILM explain API is available', async () => {
      (esClient.ilm.explainLifecycle as jest.Mock).mockResolvedValue({});

      const result = await receiver.isIlmStatsAvailable();

      expect(result).toBe(true);
      expect(esClient.ilm.explainLifecycle).toHaveBeenCalledWith({
        index: '-invalid-index',
        only_managed: false,
        filter_path: ['indices.*.phase', 'indices.*.age', 'indices.*.policy'],
      });
    });

    it('should return true when API returns 404', async () => {
      const error = { meta: { statusCode: 404 } };
      (esClient.ilm.explainLifecycle as jest.Mock).mockRejectedValue(error);

      const result = await receiver.isIlmStatsAvailable();

      expect(result).toBe(true);
    });

    it('should return false when API returns other errors', async () => {
      const error = { meta: { statusCode: 500 } };
      (esClient.ilm.explainLifecycle as jest.Mock).mockRejectedValue(error);

      const result = await receiver.isIlmStatsAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getIlmsStats', () => {
    const mockIlmResponse = {
      indices: {
        'test-index-1': {
          phase: 'hot',
          age: '1d',
          policy: 'policy1',
        },
      },
    };

    it('should successfully fetch ILM stats', async () => {
      (esClient.ilm.explainLifecycle as jest.Mock).mockResolvedValue(mockIlmResponse);

      const results = [];
      for await (const stat of receiver.getIlmsStats(['test-index-1'])) {
        results.push(stat);
      }

      expect(esClient.ilm.explainLifecycle).toHaveBeenCalledWith({
        index: 'test-index-1',
        only_managed: false,
        filter_path: ['indices.*.phase', 'indices.*.age', 'indices.*.policy'],
      });

      expect(results).toEqual([
        {
          index_name: 'test-index-1',
          phase: 'hot',
          age: '1d',
          policy_name: 'policy1',
        },
      ]);
    });

    it.each([
      { description: 'empty', mockValue: { indices: {} } },
      { description: 'null', mockValue: { indices: null } },
      { description: 'undefined', mockValue: { indices: undefined } },
    ])('should handle $description indices response', async ({ mockValue }) => {
      (esClient.ilm.explainLifecycle as jest.Mock).mockResolvedValue(mockValue);

      const results = [];
      for await (const stat of receiver.getIlmsStats(['test-index-1'])) {
        results.push(stat);
      }

      expect(results).toEqual([]);
    });

    it('should handle indices with missing properties', async () => {
      const incompleteResponse = {
        indices: {
          'test-index-1': {},
          'test-index-2': {
            phase: 'warm',
          },
        },
      };

      (esClient.ilm.explainLifecycle as jest.Mock).mockResolvedValue(incompleteResponse);

      const results = [];
      for await (const stat of receiver.getIlmsStats(['test-index-1', 'test-index-2'])) {
        results.push(stat);
      }

      expect(results).toEqual([
        {
          index_name: 'test-index-1',
          phase: undefined,
          age: undefined,
          policy_name: undefined,
        },
        {
          index_name: 'test-index-2',
          phase: 'warm',
          age: undefined,
          policy_name: undefined,
        },
      ]);
    });

    it('should handle errors from ES client', async () => {
      const error = new Error('Elasticsearch error');
      (esClient.ilm.explainLifecycle as jest.Mock).mockRejectedValue(error);

      const iterator = receiver.getIlmsStats(['test-index-1']);
      await expect(iterator.next()).rejects.toThrow('Elasticsearch error');
      // Error logging only occurs for processing errors, not ES client errors
    });
  });

  describe('getIlmsPolicies', () => {
    const mockPolicyResponse = {
      policy1: {
        modified_date: '2023-01-01',
        policy: {
          phases: {
            hot: {
              min_age: '0ms',
            },
            warm: {
              min_age: '30d',
            },
            cold: undefined,
            frozen: undefined,
            delete: {
              min_age: '365d',
            },
          },
        },
      },
    };

    it('should successfully fetch ILM policies', async () => {
      (esClient.ilm.getLifecycle as jest.Mock).mockResolvedValue(mockPolicyResponse);

      const results = [];
      for await (const policy of receiver.getIlmsPolicies(['policy1'], 30)) {
        results.push(policy);
      }

      expect(esClient.ilm.getLifecycle).toHaveBeenCalledWith({
        name: 'policy1',
        filter_path: [
          '*.policy.phases.cold.min_age',
          '*.policy.phases.delete.min_age',
          '*.policy.phases.frozen.min_age',
          '*.policy.phases.hot.min_age',
          '*.policy.phases.warm.min_age',
          '*.modified_date',
        ],
      });

      expect(results).toEqual([
        {
          policy_name: 'policy1',
          modified_date: '2023-01-01',
          phases: {
            hot: {
              min_age: '0ms',
            },
            warm: {
              min_age: '30d',
            },
            cold: undefined,
            frozen: undefined,
            delete: {
              min_age: '365d',
            },
          },
        },
      ]);
    });

    it('should handle empty policies response', async () => {
      (esClient.ilm.getLifecycle as jest.Mock).mockResolvedValue({});

      const results = [];
      for await (const policy of receiver.getIlmsPolicies(['policy1'], 30)) {
        results.push(policy);
      }

      expect(results).toEqual([]);
    });

    it('should handle chunk size limits', async () => {
      (esClient.ilm.getLifecycle as jest.Mock).mockResolvedValue(mockPolicyResponse);

      const results = [];
      for await (const policy of receiver.getIlmsPolicies(['policy1'], 5000)) {
        results.push(policy);
      }

      expect(esClient.ilm.getLifecycle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'policy1',
        })
      );
    });

    it('should handle policies with phases without min_age', async () => {
      const policyWithoutMinAge = {
        policy1: {
          modified_date: '2023-01-01',
          policy: {
            phases: {
              hot: {},
              warm: {
                actions: {},
              },
            },
          },
        },
      };

      (esClient.ilm.getLifecycle as jest.Mock).mockResolvedValue(policyWithoutMinAge);

      const results = [];
      for await (const policy of receiver.getIlmsPolicies(['policy1'], 30)) {
        results.push(policy);
      }

      expect(results).toEqual([
        {
          policy_name: 'policy1',
          modified_date: '2023-01-01',
          phases: {
            hot: undefined,
            warm: undefined,
            cold: undefined,
            frozen: undefined,
            delete: undefined,
          },
        },
      ]);
    });

    it('should handle errors from ES client', async () => {
      const error = new Error('Elasticsearch error');
      (esClient.ilm.getLifecycle as jest.Mock).mockRejectedValue(error);

      const iterator = receiver.getIlmsPolicies(['policy1'], 30);
      await expect(iterator.next()).rejects.toThrow('Elasticsearch error');
    });
  });

  describe('chunkStringsByMaxLength', () => {
    it('should properly chunk strings by maximum length', () => {
      const strings = ['short', 'medium-length', 'very-long-string-name'];

      const result = (receiver as any).chunkStringsByMaxLength(strings, 20);

      expect(result).toEqual([['short', 'medium-length'], ['very-long-string-name']]);
    });

    it('should handle empty strings array', () => {
      const strings: string[] = [];

      const result = (receiver as any).chunkStringsByMaxLength(strings, 20);

      expect(result).toEqual([]);
    });

    it('should use default max length when not provided', () => {
      const strings = ['test'];

      const result = (receiver as any).chunkStringsByMaxLength(strings);

      expect(result).toEqual([['test']]);
    });
  });
});
