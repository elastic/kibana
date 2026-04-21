/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDiagnoseStreamTool } from './diagnose_stream';
import { createMockGetScopedClients, createMockToolContext } from '../../utils/test_helpers';

const wiredStreamDef = (
  name: string,
  steps: object[] = [],
  fields: Record<string, { type: string }> = {}
) => ({
  name,
  description: `${name} stream`,
  ingest: {
    wired: { fields, routing: [] },
    processing: { steps },
    lifecycle: { inherit: {} },
    failure_store: { inherit: {} },
  },
});

const classicStreamDef = (name: string, steps: object[] = []) => ({
  name,
  description: `${name} stream`,
  ingest: {
    classic: { field_overrides: { message: { type: 'text' } } },
    processing: { steps },
    lifecycle: { inherit: {} },
    failure_store: { inherit: {} },
  },
});

describe('createDiagnoseStreamTool handler', () => {
  const setup = () => {
    const { getScopedClients, streamsClient, esClient, scopedClusterClient } =
      createMockGetScopedClients();
    const tool = createDiagnoseStreamTool({ getScopedClients, isServerless: false });
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

    const dataStreamResponse = {
      data_streams: [
        {
          name: streamName,
          indices: [{ index_name: backingIndex }],
          failure_store: {
            indices: failedDocs > 0 ? [{ index_name: failureIndex }] : [],
          },
        },
      ],
    };

    esClient.indices.getDataStream.mockResolvedValue(dataStreamResponse as any);
    scopedClusterClient.asSecondaryAuthUser.indices.getDataStream.mockResolvedValue(
      dataStreamResponse as any
    );

    esClient.indices.stats.mockResolvedValue({
      indices: {
        [backingIndex]: { primaries: { docs: { count: totalDocs } } },
      },
    } as any);
    scopedClusterClient.asSecondaryAuthUser.indices.stats.mockResolvedValue({
      indices: {
        [backingIndex]: { primaries: { docs: { count: totalDocs } } },
      },
    } as any);

    esClient.esql.query.mockResolvedValue(
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

    esClient.search.mockImplementation(async (params: any) => {
      const index = params?.index as string;
      if (index?.includes('::failures')) {
        return { hits: { total: { value: failedDocs }, hits: [] } };
      }
      return { hits: { total: { value: 0 } } };
    });
  };

  it('returns healthy status with metrics and time_window', async () => {
    const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
    const steps = [{ action: 'grok', from: 'message' }];
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.nginx', steps) as any);
    mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.nginx', {
      totalDocs: 1000,
    });

    const result = await tool.handler({ name: 'logs.ecs.nginx' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      expect(data.stream).toBe('logs.ecs.nginx');
      expect(data.stream_type).toBe('wired');
      expect(data.health).toBe('healthy');
      expect(data.time_window).toEqual(expect.objectContaining({ range: '24h' }));
      expect(data.time_window.from).toBeDefined();
      expect(data.time_window.to).toBeDefined();
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
      ]) as any
    );
    mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.broken', {
      totalDocs: 1000,
      failedDocs: 50,
    });

    const timestamps = [
      '2026-04-16T10:05:00Z',
      '2026-04-16T10:04:00Z',
      '2026-04-16T10:03:00Z',
      '2026-04-16T10:02:00Z',
      '2026-04-16T10:01:00Z',
    ];
    const failureStoreHits = timestamps.map((ts) => ({
      _source: {
        '@timestamp': ts,
        error: {
          type: 'grok_exception',
          message: 'grok pattern invalid: no match for %{INVALID}',
          stack_trace: 'at org.elasticsearch.grok.Grok.match(Grok.java:123)',
        },
      },
    }));
    esClient.search.mockImplementation(async (params: any) => {
      const index = params?.index as string;
      if (index?.includes('::failures')) {
        return { hits: { total: { value: 50 }, hits: failureStoreHits } };
      }
      return { hits: { total: { value: 0 } } };
    });

    const result = await tool.handler({ name: 'logs.ecs.broken' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      expect(data.health).toBe('failing');
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0]).toEqual(
        expect.objectContaining({
          error_type: 'grok_exception',
          error_message: expect.stringContaining('grok pattern invalid'),
          count: 5,
          first_seen: '2026-04-16T10:01:00Z',
          last_seen: '2026-04-16T10:05:00Z',
          sample_stack_trace: expect.any(String),
        })
      );
    }
  });

  it('handles query streams — returns not_applicable health', async () => {
    const { tool, context, streamsClient } = setup();
    streamsClient.getStream.mockResolvedValue({
      name: 'query.test',
      description: 'test',
      query: { esql: 'FROM logs' },
    } as any);

    const result = await tool.handler({ name: 'query.test' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      expect(data.stream_type).toBe('query');
      expect(data.health).toBe('not_applicable');
    }
  });

  it('surfaces error retrieval failure', async () => {
    const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.fail') as any);
    mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.fail', {
      totalDocs: 1000,
      failedDocs: 50,
    });

    esClient.search.mockImplementation(async (params: any) => {
      const index = params?.index as string;
      if (index?.includes('::failures')) {
        throw new Error('index_not_found_exception');
      }
      return { hits: { total: { value: 0 } } };
    });

    const result = await tool.handler({ name: 'logs.ecs.fail' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
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
      const data = result.results[0].data as Record<string, any>;
      expect(data.message).toContain('Failed to diagnose stream');
      expect(data.likely_cause).toContain('Stream not found');
    }
  });

  describe('degraded_fields breakdown', () => {
    const mockDegradedStream = (
      esClient: ReturnType<typeof createMockGetScopedClients>['esClient'],
      scopedClusterClient: ReturnType<typeof createMockGetScopedClients>['scopedClusterClient'],
      streamName: string,
      {
        totalDocs,
        degradedDocs,
        degradedFieldBuckets = [],
      }: {
        totalDocs: number;
        degradedDocs: number;
        degradedFieldBuckets?: Array<{
          key: string;
          doc_count: number;
          last_occurrence: { value: number | null };
        }>;
      }
    ) => {
      const backingIndex = `.ds-${streamName}-000001`;
      const dataStreamResponse = {
        data_streams: [
          {
            name: streamName,
            indices: [{ index_name: backingIndex }],
            failure_store: { indices: [] },
          },
        ],
      };

      esClient.indices.getDataStream.mockResolvedValue(dataStreamResponse as never);
      scopedClusterClient.asSecondaryAuthUser.indices.getDataStream.mockResolvedValue(
        dataStreamResponse as never
      );
      esClient.indices.stats.mockResolvedValue({
        indices: { [backingIndex]: { primaries: { docs: { count: totalDocs } } } },
      } as never);
      scopedClusterClient.asSecondaryAuthUser.indices.stats.mockResolvedValue({
        indices: { [backingIndex]: { primaries: { docs: { count: totalDocs } } } },
      } as never);
      esClient.esql.query.mockResolvedValue({ columns: [], values: [] } as never);

      esClient.search.mockImplementation(async (params: Record<string, unknown>) => {
        const index = params?.index as string;
        if (index?.includes('::failures')) {
          return { hits: { total: { value: 0 }, hits: [] } };
        }
        if (params?.aggs && typeof params.aggs === 'object' && 'per_index' in params.aggs) {
          return {
            aggregations: {
              per_index: {
                buckets: {
                  [backingIndex]: { doc_count: degradedDocs },
                },
              },
            },
          };
        }
        if (params?.aggs && typeof params.aggs === 'object' && 'degraded_fields' in params.aggs) {
          return {
            aggregations: {
              degraded_fields: { buckets: degradedFieldBuckets },
            },
          };
        }
        return { hits: { total: { value: 0 } } };
      });
    };

    it('returns degraded_fields when degradedCount > 0', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-otel') as never);

      mockDegradedStream(esClient, scopedClusterClient, 'logs-otel', {
        totalDocs: 3422,
        degradedDocs: 3422,
        degradedFieldBuckets: [
          {
            key: 'resource.attributes.process.command_args',
            doc_count: 154,
            last_occurrence: { value: 1776624997219 },
          },
          {
            key: 'attributes.exception.stacktrace',
            doc_count: 42,
            last_occurrence: { value: 1776624900000 },
          },
        ],
      });

      const result = await tool.handler({ name: 'logs-otel' }, context);

      if ('results' in result) {
        const data = result.results[0].data as Record<string, unknown>;
        expect(data.health).toBe('degraded');
        const degradedFields = data.degraded_fields as Array<{
          name: string;
          count: number;
          last_occurrence: string;
        }>;
        expect(degradedFields).toHaveLength(2);
        expect(degradedFields[0]).toEqual({
          name: 'resource.attributes.process.command_args',
          count: 154,
          last_occurrence: new Date(1776624997219).toISOString(),
        });
        expect(degradedFields[1]).toEqual({
          name: 'attributes.exception.stacktrace',
          count: 42,
          last_occurrence: new Date(1776624900000).toISOString(),
        });
      }
    });

    it('omits degraded_fields when degradedCount is 0', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-healthy') as never);

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
      }
    });

    it('gracefully handles degraded fields query failure', async () => {
      const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-broken') as never);

      const backingIndex = '.ds-logs-broken-000001';
      const dataStreamResponse = {
        data_streams: [
          {
            name: 'logs-broken',
            indices: [{ index_name: backingIndex }],
            failure_store: { indices: [] },
          },
        ],
      };
      esClient.indices.getDataStream.mockResolvedValue(dataStreamResponse as never);
      scopedClusterClient.asSecondaryAuthUser.indices.getDataStream.mockResolvedValue(
        dataStreamResponse as never
      );
      esClient.indices.stats.mockResolvedValue({
        indices: { [backingIndex]: { primaries: { docs: { count: 500 } } } },
      } as never);
      scopedClusterClient.asSecondaryAuthUser.indices.stats.mockResolvedValue({
        indices: { [backingIndex]: { primaries: { docs: { count: 500 } } } },
      } as never);
      esClient.esql.query.mockResolvedValue({ columns: [], values: [] } as never);

      let callCount = 0;
      esClient.search.mockImplementation(async (params: Record<string, unknown>) => {
        const index = params?.index as string;
        if (index?.includes('::failures')) {
          return { hits: { total: { value: 0 }, hits: [] } };
        }
        if (params?.aggs && typeof params.aggs === 'object' && 'per_index' in params.aggs) {
          return {
            aggregations: {
              per_index: { buckets: { [backingIndex]: { doc_count: 100 } } },
            },
          };
        }
        if (params?.aggs && typeof params.aggs === 'object' && 'degraded_fields' in params.aggs) {
          callCount++;
          throw new Error('search_phase_execution_exception');
        }
        return { hits: { total: { value: 0 } } };
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
      streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.broken') as never);
      mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.broken', {
        totalDocs: 1000,
        failedDocs: 10,
      });

      esClient.search.mockImplementation(async (params: any) => {
        const index = params?.index as string;
        if (index?.includes('::failures')) {
          return {
            hits: {
              total: { value: 10 },
              hits: [
                {
                  _source: {
                    '@timestamp': '2026-04-18T12:00:00Z',
                    error: {
                      type: 'mapper_parsing_exception',
                      message: 'failed to parse field [status] of type [long]',
                    },
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
          };
        }
        return { hits: { total: { value: 0 } } };
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
      streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.big') as never);
      mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.big', {
        totalDocs: 500,
        failedDocs: 5,
      });

      const manyFields: Record<string, string> = {};
      for (let i = 0; i < 40; i++) {
        manyFields[`field_${i}`] = i === 0 ? 'x'.repeat(300) : `val_${i}`;
      }

      esClient.search.mockImplementation(async (params: any) => {
        const index = params?.index as string;
        if (index?.includes('::failures')) {
          return {
            hits: {
              total: { value: 5 },
              hits: [
                {
                  _source: {
                    '@timestamp': '2026-04-18T12:00:00Z',
                    error: { type: 'some_error', message: 'failed' },
                    document: { source: manyFields },
                  },
                },
              ],
            },
          };
        }
        return { hits: { total: { value: 0 } } };
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
      streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.nosource') as never);
      mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.nosource', {
        totalDocs: 500,
        failedDocs: 5,
      });

      esClient.search.mockImplementation(async (params: any) => {
        const index = params?.index as string;
        if (index?.includes('::failures')) {
          return {
            hits: {
              total: { value: 5 },
              hits: [
                {
                  _source: {
                    '@timestamp': '2026-04-18T12:00:00Z',
                    error: { type: 'some_error', message: 'failed' },
                  },
                },
              ],
            },
          };
        }
        return { hits: { total: { value: 0 } } };
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
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.test') as any);
    mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.test', {
      totalDocs: 500,
    });

    const result = await tool.handler({ name: 'logs.ecs.test', time_range: '1h' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      expect(data.time_window.range).toBe('1h');

      const from = new Date(data.time_window.from).getTime();
      const to = new Date(data.time_window.to).getTime();
      const diffMs = to - from;
      expect(diffMs).toBeGreaterThan(55 * 60 * 1000);
      expect(diffMs).toBeLessThan(65 * 60 * 1000);
    }
  });

  it('passes time range filter to failure store search query', async () => {
    const { tool, context, streamsClient, esClient, scopedClusterClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.test') as any);
    mockEsClientForDocCounts(esClient, scopedClusterClient, 'logs.ecs.test', {
      totalDocs: 500,
    });

    await tool.handler({ name: 'logs.ecs.test', time_range: '6h' }, context);

    const failureStoreCall = esClient.search.mock.calls.find((call: any[]) =>
      call[0]?.index?.includes('::failures')
    );
    expect(failureStoreCall).toBeDefined();
    const searchParams = failureStoreCall![0] as any;
    expect(searchParams.query).toBeDefined();
    expect(searchParams.query.range['@timestamp']).toEqual(
      expect.objectContaining({ gte: expect.any(Number), lte: expect.any(Number) })
    );
    expect(searchParams._source).toContain('@timestamp');
  });
});
