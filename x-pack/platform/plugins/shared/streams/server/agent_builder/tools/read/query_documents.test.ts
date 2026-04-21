/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type {
  SearchHit,
  FieldCapsResponse,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import {
  getDefinitionFieldTypes,
  classifyFields,
  buildAvailableFieldsPrompt,
  computeSearchSize,
  flattenAndTruncateDocs,
  computeTimestampRange,
  detectEmptyAggregations,
  createQueryDocumentsTool,
} from './query_documents';
import { createMockGetScopedClients, createMockToolContext } from '../test_helpers';

describe('createQueryDocumentsTool handler', () => {
  const mockDefinition = {
    name: 'logs',
    query: { esql: 'FROM logs' },
  } as unknown as Streams.all.Definition;

  const emptyFieldCaps = { fields: {} } as unknown as FieldCapsResponse;
  const emptySearchResponse = {
    hits: { hits: [] },
  } as unknown as SearchResponse;

  const setup = () => {
    const { getScopedClients, streamsClient, esClient } = createMockGetScopedClients();
    const tool = createQueryDocumentsTool({ getScopedClients });
    const context = createMockToolContext();
    return { tool, context, streamsClient, esClient };
  };

  it('returns documents in expected shape', async () => {
    const { tool, context, streamsClient, esClient } = setup();

    streamsClient.getStream.mockResolvedValue(mockDefinition);
    esClient.fieldCaps.mockResolvedValue(emptyFieldCaps);
    esClient.search.mockResolvedValueOnce(emptySearchResponse).mockResolvedValueOnce({
      hits: {
        hits: [{ _index: 'logs', _id: '1', _source: { msg: 'hello' } }],
        total: { value: 1 },
      },
    } as unknown as SearchResponse);

    const inferenceClient = (await context.modelProvider.getDefaultModel()).inferenceClient;
    (inferenceClient.chatComplete as jest.Mock).mockResolvedValue({
      content: '{ "query": { "match_all": {} }, "size": 10 }',
    });

    const result = await tool.handler({ name: 'logs', query: 'show me docs' }, context);

    expect('results' in result).toBe(true);
    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.stream).toBe('logs');
      expect(data.documents).toBeDefined();
      expect(data.returned_count).toBe(1);
    }
  });

  it('indicates capped size when request exceeds max', async () => {
    const { tool, context, streamsClient, esClient } = setup();

    streamsClient.getStream.mockResolvedValue(mockDefinition);
    esClient.fieldCaps.mockResolvedValue(emptyFieldCaps);
    esClient.search.mockResolvedValueOnce(emptySearchResponse).mockResolvedValueOnce({
      hits: { hits: [], total: { value: 0 } },
    } as unknown as SearchResponse);

    const inferenceClient = (await context.modelProvider.getDefaultModel()).inferenceClient;
    (inferenceClient.chatComplete as jest.Mock).mockResolvedValue({
      content: '{ "query": { "match_all": {} }, "size": 100 }',
    });

    const result = await tool.handler({ name: 'logs', query: 'show 100 docs' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.capped).toBe(true);
      expect(data.max_documents).toBe(25);
      expect(data.requested_count).toBe(100);
    }
  });

  it('passes through _warning from translation', async () => {
    const { tool, context, streamsClient, esClient } = setup();

    streamsClient.getStream.mockResolvedValue(mockDefinition);
    esClient.fieldCaps.mockResolvedValue(emptyFieldCaps);
    esClient.search.mockResolvedValueOnce(emptySearchResponse).mockResolvedValueOnce({
      hits: { hits: [], total: { value: 0 } },
    } as unknown as SearchResponse);

    const inferenceClient = (await context.modelProvider.getDefaultModel()).inferenceClient;
    (inferenceClient.chatComplete as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        query: { match_all: {} },
        size: 10,
        _warning: 'Field is unmapped',
      }),
    });

    const result = await tool.handler({ name: 'logs', query: 'something' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.warning).toBe('Field is unmapped');
    }
  });

  it('includes aggregation_note for empty buckets', async () => {
    const { tool, context, streamsClient, esClient } = setup();

    streamsClient.getStream.mockResolvedValue(mockDefinition);
    esClient.fieldCaps.mockResolvedValue(emptyFieldCaps);
    esClient.search.mockResolvedValueOnce(emptySearchResponse).mockResolvedValueOnce({
      hits: { hits: [], total: { value: 50 } },
      aggregations: { by_level: { buckets: [] } },
    } as unknown as SearchResponse);

    const inferenceClient = (await context.modelProvider.getDefaultModel()).inferenceClient;
    (inferenceClient.chatComplete as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        query: { match_all: {} },
        aggs: { by_level: { terms: { field: 'log.level' } } },
        size: 0,
      }),
    });

    const result = await tool.handler({ name: 'logs', query: 'count by level' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.aggregation_note).toContain('empty results');
    }
  });

  it('returns error result for not-found stream', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockRejectedValue(
      Object.assign(new Error('Cannot find stream'), { statusCode: 404 })
    );

    const result = await tool.handler({ name: 'no.exist', query: 'docs' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('no.exist');
      expect(data.likely_cause).toContain('Stream not found');
    }
  });
});

describe('getDefinitionFieldTypes', () => {
  it('extracts wired stream fields', () => {
    const definition = {
      name: 'logs.test',
      ingest: {
        wired: {
          fields: {
            message: { type: 'match_only_text' },
            'host.name': { type: 'keyword' },
            count: {},
          },
          routing: [],
        },
        processing: [],
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition;

    const result = getDefinitionFieldTypes(definition);
    expect(result.get('message')).toBe('match_only_text');
    expect(result.get('host.name')).toBe('keyword');
    expect(result.has('count')).toBe(false);
  });

  it('extracts classic stream field_overrides', () => {
    const definition = {
      name: 'logs.classic',
      ingest: {
        classic: {
          field_overrides: {
            message: { type: 'text' },
          },
        },
        processing: [],
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition;

    const result = getDefinitionFieldTypes(definition);
    expect(result.get('message')).toBe('text');
  });

  it('returns empty map for non-ingest (query) streams', () => {
    const definition = {
      name: 'query.test',
      query: { esql: 'FROM logs' },
    } as unknown as Streams.all.Definition;

    const result = getDefinitionFieldTypes(definition);
    expect(result.size).toBe(0);
  });
});

describe('classifyFields', () => {
  it('classifies field_caps fields as aggregatable or not', () => {
    const result = classifyFields({
      fieldCapsFields: {
        'host.name': { keyword: { type: 'keyword', aggregatable: true } },
        message: { text: { type: 'text', aggregatable: false } },
      },
      sampleHits: [],
      definitionFieldTypes: new Map(),
    });

    expect(result).toContainEqual({
      name: 'host.name',
      type: 'keyword',
      capability: 'aggregatable',
    });
    expect(result).toContainEqual({
      name: 'message',
      type: 'text',
      capability: 'not aggregatable',
    });
  });

  it('skips metadata fields', () => {
    const result = classifyFields({
      fieldCapsFields: {
        _index: { _index: { type: '_index', aggregatable: true, metadata_field: true } },
        'host.name': { keyword: { type: 'keyword', aggregatable: true } },
      },
      sampleHits: [],
      definitionFieldTypes: new Map(),
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('host.name');
  });

  it('adds sample doc fields as source-only when not in field_caps', () => {
    const hits: Array<SearchHit<unknown>> = [
      {
        _index: 'logs',
        _id: '1',
        _source: { 'host.name': 'h1', 'extra.field': 'val' },
      },
    ];
    const result = classifyFields({
      fieldCapsFields: {
        'host.name': { keyword: { type: 'keyword', aggregatable: true } },
      },
      sampleHits: hits,
      definitionFieldTypes: new Map(),
    });

    expect(result).toContainEqual({
      name: 'extra.field',
      type: 'unmapped',
      capability: 'source-only',
    });
    expect(result).not.toContainEqual(
      expect.objectContaining({ name: 'host.name', capability: 'source-only' })
    );
  });

  it('applies definition type overrides', () => {
    const result = classifyFields({
      fieldCapsFields: {
        message: { text: { type: 'text', aggregatable: false } },
      },
      sampleHits: [],
      definitionFieldTypes: new Map([['message', 'match_only_text']]),
    });

    expect(result[0].type).toBe('match_only_text');
  });

  it('skips hits without _source', () => {
    const hits = [{ _index: 'logs', _id: '1', _source: undefined }] as Array<SearchHit<unknown>>;
    const result = classifyFields({
      fieldCapsFields: {},
      sampleHits: hits,
      definitionFieldTypes: new Map(),
    });

    expect(result).toHaveLength(0);
  });
});

describe('buildAvailableFieldsPrompt', () => {
  it('returns sorted comma-separated output', () => {
    const entries = [
      { name: 'zebra', type: 'keyword', capability: 'aggregatable' as const },
      { name: 'alpha', type: 'text', capability: 'not aggregatable' as const },
    ];
    const result = buildAvailableFieldsPrompt(entries);
    expect(result).toBe('alpha (text, not aggregatable), zebra (keyword, aggregatable)');
  });

  it('truncates at maxFields with omission note', () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      name: `field_${String(i).padStart(2, '0')}`,
      type: 'keyword',
      capability: 'aggregatable' as const,
    }));
    const result = buildAvailableFieldsPrompt(entries, 3);
    expect(result).toContain('field_00');
    expect(result).toContain('field_02');
    expect(result).toContain('(2 more fields omitted)');
    expect(result).not.toContain('field_03');
  });

  it('truncates at maxChars with ellipsis', () => {
    const entries = [
      { name: 'a_very_long_field_name', type: 'keyword', capability: 'aggregatable' as const },
    ];
    const result = buildAvailableFieldsPrompt(entries, 1000, 10);
    expect(result.length).toBeLessThanOrEqual(12);
    expect(result).toContain('…');
  });
});

describe('computeSearchSize', () => {
  it('returns default size when not specified', () => {
    const { requestedSize, cappedSize } = computeSearchSize({});
    expect(requestedSize).toBe(10);
    expect(cappedSize).toBe(10);
  });

  it('clamps negative size to 0', () => {
    const { requestedSize, cappedSize } = computeSearchSize({ size: -5 });
    expect(requestedSize).toBe(0);
    expect(cappedSize).toBe(0);
  });

  it('caps size at MAX_DOCUMENTS (25)', () => {
    const { requestedSize, cappedSize } = computeSearchSize({ size: 100 });
    expect(requestedSize).toBe(100);
    expect(cappedSize).toBe(25);
  });

  it('returns 0 for agg-only queries with no explicit size', () => {
    const { cappedSize } = computeSearchSize({ aggs: { by_level: {} } });
    expect(cappedSize).toBe(0);
  });

  it('respects explicit size with aggs', () => {
    const { cappedSize } = computeSearchSize({ aggs: { by_level: {} }, size: 5 });
    expect(cappedSize).toBe(5);
  });
});

describe('flattenAndTruncateDocs', () => {
  it('flattens nested objects', () => {
    const hits: Array<SearchHit<unknown>> = [
      { _index: 'i', _id: '1', _source: { host: { name: 'h1' } } },
    ];
    const result = flattenAndTruncateDocs(hits);
    expect(result[0]).toEqual({ 'host.name': 'h1' });
  });

  it('truncates long strings', () => {
    const longVal = 'x'.repeat(300);
    const hits: Array<SearchHit<unknown>> = [{ _index: 'i', _id: '1', _source: { msg: longVal } }];
    const result = flattenAndTruncateDocs(hits, 50);
    expect(result[0].msg).toHaveLength(53);
    expect((result[0].msg as string).endsWith('...')).toBe(true);
  });

  it('handles null _source gracefully', () => {
    const hits = [
      { _index: 'i', _id: '1', _source: null },
      { _index: 'i', _id: '2', _source: { ok: true } },
    ] as unknown as Array<SearchHit<unknown>>;
    const result = flattenAndTruncateDocs(hits);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({});
    expect(result[1]).toEqual({ ok: true });
  });
});

describe('computeTimestampRange', () => {
  it('finds min/max from ISO strings', () => {
    const docs = [
      { '@timestamp': '2024-01-01T00:00:00Z', val: 1 },
      { '@timestamp': '2024-01-03T00:00:00Z', val: 2 },
      { '@timestamp': '2024-01-02T00:00:00Z', val: 3 },
    ];
    const { oldest, newest } = computeTimestampRange(docs);
    expect(oldest).toBe(new Date('2024-01-01T00:00:00Z').getTime());
    expect(newest).toBe(new Date('2024-01-03T00:00:00Z').getTime());
  });

  it('finds min/max from epoch numbers', () => {
    const docs = [{ '@timestamp': 1000 }, { '@timestamp': 3000 }, { '@timestamp': 2000 }];
    const { oldest, newest } = computeTimestampRange(docs);
    expect(oldest).toBe(1000);
    expect(newest).toBe(3000);
  });

  it('returns null when no timestamps', () => {
    const docs = [{ val: 1 }, { val: 2 }];
    const { oldest, newest } = computeTimestampRange(docs);
    expect(oldest).toBeNull();
    expect(newest).toBeNull();
  });
});

describe('detectEmptyAggregations', () => {
  it('returns note when all buckets empty and totalHits > 0', () => {
    const aggs = {
      by_level: { buckets: [] },
      by_host: { buckets: [] },
    };
    const note = detectEmptyAggregations(aggs, 100);
    expect(note).toContain('empty results');
  });

  it('returns undefined when buckets have data', () => {
    const aggs = {
      by_level: { buckets: [{ key: 'error', doc_count: 5 }] },
    };
    expect(detectEmptyAggregations(aggs, 100)).toBeUndefined();
  });

  it('returns undefined for non-bucket aggregations', () => {
    const aggs = {
      avg_duration: { value: 42 },
    };
    expect(detectEmptyAggregations(aggs, 100)).toBeUndefined();
  });

  it('returns undefined when totalHits is 0', () => {
    const aggs = { by_level: { buckets: [] } };
    expect(detectEmptyAggregations(aggs, 0)).toBeUndefined();
  });
});
