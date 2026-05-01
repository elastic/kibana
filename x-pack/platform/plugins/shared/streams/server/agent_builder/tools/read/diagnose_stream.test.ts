/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { StreamlangStep } from '@kbn/streamlang/types/streamlang';
import type { Streams, FieldDefinition } from '@kbn/streams-schema';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createDiagnoseStreamTool } from './diagnose_stream';
import {
  createMockGetScopedClients,
  createMockToolContext,
  mockEsMethodResolvedValue,
} from '../../utils/test_helpers';

const searchResponseDefaults = {
  took: 0,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
} as const;

const mockSearchResponse = (overrides: Partial<SearchResponse> = {}): SearchResponse => ({
  ...searchResponseDefaults,
  hits: { total: { value: 0, relation: 'eq' }, hits: [] },
  ...overrides,
});

const mockDataStreamResponse = (
  streamName: string,
  backingIndex: string,
  failureIndex?: string
) => ({
  data_streams: [
    {
      name: streamName,
      indices: [{ index_name: backingIndex }],
      failure_store: {
        indices: failureIndex ? [{ index_name: failureIndex }] : [],
      },
    },
  ],
});

const mockIndicesStatsResponse = (backingIndex: string, docCount: number) => ({
  _shards: { total: 1, successful: 1, failed: 0 },
  _all: {},
  indices: {
    [backingIndex]: { primaries: { docs: { count: docCount } } },
  },
});

const wiredStreamDef = (
  name: string,
  steps: StreamlangStep[] = [],
  fields: FieldDefinition = {}
): Streams.WiredStream.Definition => ({
  type: 'wired',
  name,
  description: `${name} stream`,
  updated_at: '2026-04-10T00:00:00.000Z',
  ingest: {
    wired: { fields, routing: [] },
    processing: { steps, updated_at: '2026-04-10T00:00:00.000Z' },
    lifecycle: { inherit: {} },
    failure_store: { inherit: {} },
    settings: {},
  },
});

const classicStreamDef = (
  name: string,
  steps: StreamlangStep[] = []
): Streams.ClassicStream.Definition => ({
  type: 'classic',
  name,
  description: `${name} stream`,
  updated_at: '2026-04-10T00:00:00.000Z',
  ingest: {
    classic: { field_overrides: { message: { type: 'match_only_text' } } },
    processing: { steps, updated_at: '2026-04-10T00:00:00.000Z' },
    lifecycle: { inherit: {} },
    failure_store: { inherit: {} },
    settings: {},
  },
});

const queryStreamDef = (name: string): Streams.QueryStream.Definition => ({
  type: 'query',
  name,
  description: 'test',
  updated_at: '2026-04-10T00:00:00.000Z',
  query: { esql: 'FROM logs', view: '' },
});

describe('createDiagnoseStreamTool handler', () => {
  const setup = () => {
    const { getScopedClients, streamsClient, esClient, scopedClusterClient } =
      createMockGetScopedClients();
    const tool = createDiagnoseStreamTool({
      getScopedClients,
      isServerless: false,
      logger: loggingSystemMock.createLogger(),
    });
    const context = createMockToolContext();
    return { tool, context, streamsClient, esClient, scopedClusterClient };
  };

  const mockEsClientForDocCounts = (
    esClient: ReturnType<typeof createMockGetScopedClients>['esClient'],
    scopedClusterClient: ReturnType<typeof createMockGetScopedClients>['scopedClusterClient'],
    streamName: string,
    { totalDocs = 1000, failedDocs = 0 }: { totalDocs?: number; failedDocs?: number }
  ) => {
    const backingIndex = `.ds-${streamName}-000001`;
    const failureIndex = `.ds-${streamName}-failures-000001`;

    const dataStreamResponse = mockDataStreamResponse(
      streamName,
      backingIndex,
      failedDocs > 0 ? failureIndex : undefined
    );

    mockEsMethodResolvedValue(esClient.indices.getDataStream, dataStreamResponse);
    mockEsMethodResolvedValue(
      scopedClusterClient.asSecondaryAuthUser.indices.getDataStream,
      dataStreamResponse
    );

    const statsResponse = mockIndicesStatsResponse(backingIndex, totalDocs);
    mockEsMethodResolvedValue(esClient.indices.stats, statsResponse);
    mockEsMethodResolvedValue(scopedClusterClient.asSecondaryAuthUser.indices.stats, statsResponse);

    mockEsMethodResolvedValue(
      esClient.esql.query,
      failedDocs > 0
        ? {
            columns: [
              { name: 'failed_count', type: 'long' },
              { name: 'backing_index', type: 'keyword' },
            ],
            values: [[failedDocs, failureIndex]],
          }
        : { columns: [], values: [] }
    );

    esClient.search.mockImplementation(async (params?: SearchRequest) => {
      const index = params?.index as string;
      if (index?.includes('::failures')) {
        return mockSearchResponse({
          hits: { total: { value: failedDocs, relation: 'eq' }, hits: [] },
          aggregations: { error_groups: { buckets: [] } },
        });
      }
      return mockSearchResponse();
    });
  };

  it('returns healthy status with metrics and time_window', async () => {
    const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
    const steps: StreamlangStep[] = [
      { action: 'grok', from: 'message', patterns: ['%{GREEDYDATA}'] },
    ];
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.nginx', steps));
    mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.nginx', {
      totalDocs: 1000,
    });

    const result = await tool.handler({ name: 'logs.ecs.nginx' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.stream).toBe('logs.ecs.nginx');
      expect(data.stream_type).toBe('wired');
      expect(data.health).toBe('healthy');
      const timeWindow = data.time_window as Record<string, string>;
      expect(timeWindow).toEqual(expect.objectContaining({ range: '24h' }));
      expect(timeWindow.from).toBeDefined();
      expect(timeWindow.to).toBeDefined();
      expect(data.metrics).toEqual(
        expect.objectContaining({
          total_docs: 1000,
          degraded_docs: 0,
          recent_failed_docs: 0,
        })
      );
      expect(data.errors).toEqual([]);
      expect(data.processing_chain).toBeUndefined();
      expect(data.field_mappings).toBeUndefined();
    }
  });

  it('returns failing health with error samples including timestamps', async () => {
    const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
    streamsClient.getStream.mockResolvedValue(
      wiredStreamDef('logs.ecs.broken', [
        { action: 'grok', from: 'message', patterns: ['%{INVALID}'] },
      ])
    );
    mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.broken', {
      totalDocs: 1000,
      failedDocs: 50,
    });

    esClient.search.mockImplementation(async (params?: SearchRequest) => {
      const index = params?.index as string;
      if (index?.includes('::failures')) {
        return mockSearchResponse({
          hits: { total: { value: 50, relation: 'eq' }, hits: [] },
          aggregations: {
            error_groups: {
              buckets: [
                {
                  key: ['grok_exception', 'grok pattern invalid: no match for %{INVALID}'],
                  doc_count: 5,
                  first_seen: { value: new Date('2026-04-16T10:01:00Z').getTime() },
                  last_seen: { value: new Date('2026-04-16T10:05:00Z').getTime() },
                  sample: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2026-04-16T10:05:00Z',
                            error: {
                              stack_trace: 'at org.elasticsearch.grok.Grok.match(Grok.java:123)',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        });
      }
      return mockSearchResponse();
    });

    const result = await tool.handler({ name: 'logs.ecs.broken' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      const errors = data.errors as Array<Record<string, unknown>>;
      expect(data.health).toBe('failing');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual(
        expect.objectContaining({
          error_type: 'grok_exception',
          error_message: expect.stringContaining('grok pattern invalid'),
          count: 5,
          first_seen: '2026-04-16T10:01:00.000Z',
          last_seen: '2026-04-16T10:05:00.000Z',
          sample_stack_trace: expect.any(String),
        })
      );
    }
  });

  it('handles query streams — returns not_applicable health', async () => {
    const { tool, context, streamsClient } = setup();
    streamsClient.getStream.mockResolvedValue(queryStreamDef('query.test'));

    const result = await tool.handler({ name: 'query.test' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.stream_type).toBe('query');
      expect(data.health).toBe('not_applicable');
    }
  });

  it('surfaces error retrieval failure', async () => {
    const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.fail'));
    mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.fail', {
      totalDocs: 1000,
      failedDocs: 50,
    });

    esClient.search.mockImplementation(async (params?: SearchRequest) => {
      const index = params?.index as string;
      if (index?.includes('::failures')) {
        throw new Error('index_not_found_exception');
      }
      return mockSearchResponse();
    });

    const result = await tool.handler({ name: 'logs.ecs.fail' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.health).toBe('failing');
      expect(data.errors).toEqual([]);
      expect(data.errors_retrieval_error).toContain('index_not_found_exception');
    }
  });

  it('returns error result on stream not found', async () => {
    const { tool, context, streamsClient } = setup();
    streamsClient.getStream.mockRejectedValue(new Error('Cannot find stream logs.ecs.missing'));

    const result = await tool.handler({ name: 'logs.ecs.missing' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Failed to diagnose stream');
      expect(data.likely_cause).toContain('Stream not found');
    }
  });

  describe('degraded_fields breakdown', () => {
    const emptySample = { hits: { hits: [] } };

    const mockDegradedStream = (
      esClient: ReturnType<typeof createMockGetScopedClients>['esClient'],
      scopedClusterClient: ReturnType<typeof createMockGetScopedClients>['scopedClusterClient'],
      streamName: string,
      {
        totalDocs,
        degradedDocs,
        degradedFieldBuckets = [],
        fieldMappingResponse,
      }: {
        totalDocs: number;
        degradedDocs: number;
        degradedFieldBuckets?: Array<{
          key: string;
          doc_count: number;
          last_occurrence: { value: number | null };
          sample?: { hits: { hits: Array<{ _source?: Record<string, unknown> }> } };
        }>;
        fieldMappingResponse?: Record<string, unknown>;
      }
    ) => {
      const backingIndex = `.ds-${streamName}-000001`;
      const dataStreamResponse = mockDataStreamResponse(streamName, backingIndex);

      mockEsMethodResolvedValue(esClient.indices.getDataStream, dataStreamResponse);
      mockEsMethodResolvedValue(
        scopedClusterClient.asSecondaryAuthUser.indices.getDataStream,
        dataStreamResponse
      );
      const statsResponse = mockIndicesStatsResponse(backingIndex, totalDocs);
      mockEsMethodResolvedValue(esClient.indices.stats, statsResponse);
      mockEsMethodResolvedValue(
        scopedClusterClient.asSecondaryAuthUser.indices.stats,
        statsResponse
      );
      mockEsMethodResolvedValue(esClient.esql.query, { columns: [], values: [] });
      mockEsMethodResolvedValue(
        esClient.indices.getFieldMapping,
        fieldMappingResponse ?? { [backingIndex]: { mappings: {} } }
      );

      esClient.search.mockImplementation(async (params?: SearchRequest) => {
        const index = params?.index as string;
        if (index?.includes('::failures')) {
          return mockSearchResponse({
            aggregations: { error_groups: { buckets: [] } },
          });
        }
        if (params?.aggs && typeof params.aggs === 'object' && 'per_index' in params.aggs) {
          return mockSearchResponse({
            aggregations: {
              per_index: {
                buckets: {
                  [backingIndex]: { doc_count: degradedDocs },
                },
              },
            },
          });
        }
        if (params?.aggs && typeof params.aggs === 'object' && 'degraded_fields' in params.aggs) {
          return mockSearchResponse({
            aggregations: {
              degraded_fields: { buckets: degradedFieldBuckets },
            },
          });
        }
        return mockSearchResponse();
      });
    };

    it('returns degraded_fields with mapping constraints and sample_value', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-otel'));

      mockDegradedStream(esClient, scopedClusterClient, 'logs-otel', {
        totalDocs: 3422,
        degradedDocs: 3422,
        degradedFieldBuckets: [
          {
            key: 'resource.attributes.process.command_args',
            doc_count: 154,
            last_occurrence: { value: 1776624997219 },
            sample: {
              hits: {
                hits: [
                  {
                    _source: {
                      resource: {
                        attributes: {
                          process: { command_args: '/usr/bin/java -Xmx512m -jar app.jar' },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          {
            key: 'attributes.exception.stacktrace',
            doc_count: 42,
            last_occurrence: { value: 1776624900000 },
            sample: emptySample,
          },
        ],
        fieldMappingResponse: {
          '.ds-logs-otel-000001': {
            mappings: {
              'resource.attributes.process.command_args': {
                full_name: 'resource.attributes.process.command_args',
                mapping: {
                  'process.command_args': { type: 'keyword', ignore_above: 1024 },
                },
              },
              'attributes.exception.stacktrace': {
                full_name: 'attributes.exception.stacktrace',
                mapping: {
                  'exception.stacktrace': { type: 'keyword', ignore_above: 8191 },
                },
              },
            },
          },
        },
      });

      const result = await tool.handler({ name: 'logs-otel' }, context);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, unknown>;
        expect(data.health).toBe('degraded');
        const degradedFields = data.degraded_fields as Array<{
          name: string;
          count: number;
          last_occurrence: string;
          sample_value?: unknown;
          mapping?: Record<string, unknown>;
        }>;
        expect(degradedFields).toHaveLength(2);
        expect(degradedFields[0]).toEqual({
          name: 'resource.attributes.process.command_args',
          count: 154,
          last_occurrence: new Date(1776624997219).toISOString(),
          sample_value: '/usr/bin/java -Xmx512m -jar app.jar',
          mapping: { type: 'keyword', ignore_above: 1024 },
        });
        expect(degradedFields[1]).toEqual({
          name: 'attributes.exception.stacktrace',
          count: 42,
          last_occurrence: new Date(1776624900000).toISOString(),
          mapping: { type: 'keyword', ignore_above: 8191 },
        });
      }
    });

    it('omits mapping when field mapping lookup returns no results', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-otel'));

      mockDegradedStream(esClient, scopedClusterClient, 'logs-otel', {
        totalDocs: 3422,
        degradedDocs: 3422,
        degradedFieldBuckets: [
          {
            key: 'resource.attributes.process.command_args',
            doc_count: 154,
            last_occurrence: { value: 1776624997219 },
          },
        ],
      });

      const result = await tool.handler({ name: 'logs-otel' }, context);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, unknown>;
        const degradedFields = data.degraded_fields as Array<{
          name: string;
          mapping?: Record<string, unknown>;
        }>;
        expect(degradedFields).toHaveLength(1);
        expect(degradedFields[0].mapping).toBeUndefined();
      }
    });

    it('degrades gracefully when field mapping lookup throws', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-otel'));

      mockDegradedStream(esClient, scopedClusterClient, 'logs-otel', {
        totalDocs: 3422,
        degradedDocs: 3422,
        degradedFieldBuckets: [
          {
            key: 'resource.attributes.process.command_args',
            doc_count: 154,
            last_occurrence: { value: 1776624997219 },
          },
        ],
      });
      esClient.indices.getFieldMapping.mockRejectedValue(
        new Error('security_exception: unauthorized')
      );

      const result = await tool.handler({ name: 'logs-otel' }, context);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, unknown>;
        expect(data.health).toBe('degraded');
        const degradedFields = data.degraded_fields as Array<{
          name: string;
          count: number;
          mapping?: Record<string, unknown>;
        }>;
        expect(degradedFields).toHaveLength(1);
        expect(degradedFields[0].name).toBe('resource.attributes.process.command_args');
        expect(degradedFields[0].count).toBe(154);
        expect(degradedFields[0].mapping).toBeUndefined();
      }
    });

    it('truncates long sample_value strings', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-otel'));

      const longValue = 'x'.repeat(300);
      mockDegradedStream(esClient, scopedClusterClient, 'logs-otel', {
        totalDocs: 1000,
        degradedDocs: 500,
        degradedFieldBuckets: [
          {
            key: 'attributes.stacktrace',
            doc_count: 500,
            last_occurrence: { value: 1776624997219 },
            sample: {
              hits: {
                hits: [{ _source: { attributes: { stacktrace: longValue } } }],
              },
            },
          },
        ],
      });

      const result = await tool.handler({ name: 'logs-otel' }, context);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, unknown>;
        const degradedFields = data.degraded_fields as Array<{
          sample_value?: unknown;
        }>;
        expect(degradedFields).toHaveLength(1);
        const val = degradedFields[0].sample_value as string;
        expect(val.length).toBe(203);
        expect(val.endsWith('...')).toBe(true);
      }
    });

    it('omits sample_value when field is not found in sample _source', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-otel'));

      mockDegradedStream(esClient, scopedClusterClient, 'logs-otel', {
        totalDocs: 1000,
        degradedDocs: 500,
        degradedFieldBuckets: [
          {
            key: 'attributes.missing.field',
            doc_count: 500,
            last_occurrence: { value: 1776624997219 },
            sample: {
              hits: {
                hits: [{ _source: { attributes: { other: 'value' } } }],
              },
            },
          },
        ],
      });

      const result = await tool.handler({ name: 'logs-otel' }, context);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, unknown>;
        const degradedFields = data.degraded_fields as Array<{
          name: string;
          sample_value?: unknown;
        }>;
        expect(degradedFields).toHaveLength(1);
        expect(degradedFields[0].sample_value).toBeUndefined();
      }
    });

    it('omits degraded_fields when degradedCount is 0 and skips mapping lookup', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-healthy'));

      mockDegradedStream(esClient, scopedClusterClient, 'logs-healthy', {
        totalDocs: 1000,
        degradedDocs: 0,
      });

      const result = await tool.handler({ name: 'logs-healthy' }, context);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, unknown>;
        expect(data.health).toBe('healthy');
        expect(data.degraded_fields).toBeUndefined();

        const searchCalls = esClient.search.mock.calls;
        const degradedFieldsCall = searchCalls.find((call) => {
          const params = call[0] as Record<string, unknown> | undefined;
          return (
            params?.aggs && typeof params.aggs === 'object' && 'degraded_fields' in params.aggs
          );
        });
        expect(degradedFieldsCall).toBeUndefined();
        expect(esClient.indices.getFieldMapping).not.toHaveBeenCalled();
      }
    });

    it('gracefully handles degraded fields query failure', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-broken'));

      const backingIndex = '.ds-logs-broken-000001';
      const dataStreamResponse = mockDataStreamResponse('logs-broken', backingIndex);
      mockEsMethodResolvedValue(esClient.indices.getDataStream, dataStreamResponse);
      mockEsMethodResolvedValue(
        scopedClusterClient.asSecondaryAuthUser.indices.getDataStream,
        dataStreamResponse
      );
      const statsResponse = mockIndicesStatsResponse(backingIndex, 500);
      mockEsMethodResolvedValue(esClient.indices.stats, statsResponse);
      mockEsMethodResolvedValue(
        scopedClusterClient.asSecondaryAuthUser.indices.stats,
        statsResponse
      );
      mockEsMethodResolvedValue(esClient.esql.query, { columns: [], values: [] });

      let callCount = 0;
      esClient.search.mockImplementation(async (params?: SearchRequest) => {
        const index = params?.index as string;
        if (index?.includes('::failures')) {
          return mockSearchResponse({
            aggregations: { error_groups: { buckets: [] } },
          });
        }
        if (params?.aggs && typeof params.aggs === 'object' && 'per_index' in params.aggs) {
          return mockSearchResponse({
            aggregations: {
              per_index: { buckets: { [backingIndex]: { doc_count: 100 } } },
            },
          });
        }
        if (params?.aggs && typeof params.aggs === 'object' && 'degraded_fields' in params.aggs) {
          callCount++;
          throw new Error('search_phase_execution_exception');
        }
        return mockSearchResponse();
      });

      const result = await tool.handler({ name: 'logs-broken' }, context);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, unknown>;
        expect(data.health).toBe('degraded');
        expect(data.degraded_fields).toBeUndefined();
        expect(callCount).toBe(1);
      }
    });
  });

  describe('sample_document in error groups', () => {
    it('includes flattened sample_document from document.source', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.broken'));
      mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.broken', {
        totalDocs: 1000,
        failedDocs: 10,
      });

      esClient.search.mockImplementation(async (params?: SearchRequest) => {
        const index = params?.index as string;
        if (index?.includes('::failures')) {
          return mockSearchResponse({
            hits: { total: { value: 10, relation: 'eq' }, hits: [] },
            aggregations: {
              error_groups: {
                buckets: [
                  {
                    key: [
                      'mapper_parsing_exception',
                      'failed to parse field [status] of type [long]',
                    ],
                    doc_count: 1,
                    first_seen: { value: new Date('2026-04-18T12:00:00Z').getTime() },
                    last_seen: { value: new Date('2026-04-18T12:00:00Z').getTime() },
                    sample: {
                      hits: {
                        hits: [
                          {
                            _source: {
                              '@timestamp': '2026-04-18T12:00:00Z',
                              document: {
                                source: {
                                  message: 'GET /api/health 200',
                                  status: 'ok',
                                  host: { name: 'web-01' },
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          });
        }
        return mockSearchResponse();
      });

      const result = await tool.handler({ name: 'logs.ecs.broken' }, context);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, unknown>;
        const errors = data.errors as Array<Record<string, unknown>>;
        expect(errors).toHaveLength(1);
        expect(errors[0].sample_document).toEqual({
          message: 'GET /api/health 200',
          status: 'ok',
          'host.name': 'web-01',
        });
      }
    });

    it('truncates long strings and caps field count in sample_document', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.big'));
      mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.big', {
        totalDocs: 500,
        failedDocs: 5,
      });

      const manyFields: Record<string, string> = {};
      for (let i = 0; i < 40; i++) {
        manyFields[`field_${i}`] = i === 0 ? 'x'.repeat(300) : `val_${i}`;
      }

      esClient.search.mockImplementation(async (params?: SearchRequest) => {
        const index = params?.index as string;
        if (index?.includes('::failures')) {
          return mockSearchResponse({
            hits: { total: { value: 5, relation: 'eq' }, hits: [] },
            aggregations: {
              error_groups: {
                buckets: [
                  {
                    key: ['some_error', 'failed'],
                    doc_count: 1,
                    first_seen: { value: new Date('2026-04-18T12:00:00Z').getTime() },
                    last_seen: { value: new Date('2026-04-18T12:00:00Z').getTime() },
                    sample: {
                      hits: {
                        hits: [
                          {
                            _source: {
                              '@timestamp': '2026-04-18T12:00:00Z',
                              document: { source: manyFields },
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          });
        }
        return mockSearchResponse();
      });

      const result = await tool.handler({ name: 'logs.ecs.big' }, context);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, unknown>;
        const errors = data.errors as Array<Record<string, unknown>>;
        const sampleDoc = errors[0].sample_document as Record<string, unknown>;
        expect(sampleDoc).toBeDefined();
        const keys = Object.keys(sampleDoc);
        expect(keys).toHaveLength(31);
        expect(sampleDoc._truncated).toBe('10 more fields omitted');
        expect((sampleDoc.field_0 as string).length).toBe(203);
        expect((sampleDoc.field_0 as string).endsWith('...')).toBe(true);
      }
    });

    it('omits sample_document when document.source is absent', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.nosource'));
      mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.nosource', {
        totalDocs: 500,
        failedDocs: 5,
      });

      esClient.search.mockImplementation(async (params?: SearchRequest) => {
        const index = params?.index as string;
        if (index?.includes('::failures')) {
          return mockSearchResponse({
            hits: { total: { value: 5, relation: 'eq' }, hits: [] },
            aggregations: {
              error_groups: {
                buckets: [
                  {
                    key: ['some_error', 'failed'],
                    doc_count: 1,
                    first_seen: { value: new Date('2026-04-18T12:00:00Z').getTime() },
                    last_seen: { value: new Date('2026-04-18T12:00:00Z').getTime() },
                    sample: {
                      hits: {
                        hits: [
                          {
                            _source: {
                              '@timestamp': '2026-04-18T12:00:00Z',
                              error: { type: 'some_error', message: 'failed' },
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          });
        }
        return mockSearchResponse();
      });

      const result = await tool.handler({ name: 'logs.ecs.nosource' }, context);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, unknown>;
        const errors = data.errors as Array<Record<string, unknown>>;
        expect(errors).toHaveLength(1);
        expect(errors[0].sample_document).toBeUndefined();
      }
    });
  });

  it('uses custom time_range for failed counts and error samples', async () => {
    const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.test'));
    mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.test', {
      totalDocs: 500,
    });

    const result = await tool.handler({ name: 'logs.ecs.test', time_range: '1h' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      const timeWindow = data.time_window as Record<string, string>;
      expect(timeWindow.range).toBe('1h');

      const from = new Date(timeWindow.from).getTime();
      const to = new Date(timeWindow.to).getTime();
      const diffMs = to - from;
      expect(diffMs).toBeGreaterThan(55 * 60 * 1000);
      expect(diffMs).toBeLessThan(65 * 60 * 1000);
    }
  });

  it('passes time range filter to failure store search query', async () => {
    const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.test'));
    mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.test', {
      totalDocs: 500,
    });

    await tool.handler({ name: 'logs.ecs.test', time_range: '6h' }, context);

    const failureStoreCall = esClient.search.mock.calls.find((call) => {
      const params = call[0] as SearchRequest | undefined;
      return (params?.index as string)?.includes('::failures');
    });
    expect(failureStoreCall).toBeDefined();
    const searchParams = failureStoreCall![0] as SearchRequest;
    expect(searchParams.query).toBeDefined();
    const rangeQuery = searchParams.query as { range: Record<string, Record<string, unknown>> };
    expect(rangeQuery.range['@timestamp']).toEqual(
      expect.objectContaining({ gte: expect.any(Number), lte: expect.any(Number) })
    );
    expect(searchParams.size).toBe(0);
    expect(searchParams.aggs).toBeDefined();
    const aggs = searchParams.aggs as Record<string, unknown>;
    expect(aggs).toHaveProperty('error_groups');
  });
});
