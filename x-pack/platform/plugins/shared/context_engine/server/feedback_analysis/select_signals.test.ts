/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { AiIndexSource } from '../../common/http_api/ai_indices';
import type { Signal } from '../../common/http_api/signals';
import { rawIndexExpressionsFor, selectSignals } from './select_signals';

const NOW = new Date('2026-09-01T12:00:00.000Z');

const buildSignal = (overrides: {
  id: string;
  queryKind?: 'ki_retrieval' | 'raw_access';
  targetIndex?: string;
  conversationId?: string;
  timestamp?: string;
  tags?: string[];
  tool?: string;
  error?: string;
}): Signal =>
  ({
    signal_id: overrides.id,
    '@timestamp': overrides.timestamp ?? '2026-09-01T11:00:00.000Z',
    signal_type: 'tool_call',
    tags: overrides.tags ?? [],
    data: {
      tool: overrides.tool ?? 'execute_esql',
      query_kind: overrides.queryKind ?? 'ki_retrieval',
      target_index: overrides.targetIndex ?? 'ai-index-idx-orders',
      status: 'Ok',
      returned: { row_count: 0 },
      ...(overrides.error ? { error: overrides.error } : {}),
      ...(overrides.conversationId ? { conversation_id: overrides.conversationId } : {}),
    },
  } as unknown as Signal);

/** One (tag, target, tool) combination, shaped as the nested terms aggregation returns it. */
const patternBucket = (tag: string, target: string, tool: string, count: number) => ({
  key: tag,
  doc_count: count,
  targets: {
    buckets: [
      { key: target, doc_count: count, tools: { buckets: [{ key: tool, doc_count: count }] } },
    ],
  },
});

const mainResponse = ({
  patterns = [],
  spaces = ['context-engine-signals-default'],
  total = 0,
  signals = [],
}: {
  patterns?: ReturnType<typeof patternBucket>[];
  spaces?: string[];
  total?: number;
  signals?: Signal[];
} = {}) => ({
  hits: {
    total: { value: total, relation: 'eq' },
    hits: signals.map((signal) => ({
      _index: 'context-engine-signals-default',
      _id: signal.signal_id,
      _source: signal,
    })),
  },
  aggregations: {
    spaces: { buckets: spaces.map((key) => ({ key, doc_count: 1 })) },
    patterns: { buckets: patterns },
  },
});

const conversationsResponse = (ids: string[]) => ({
  hits: { total: { value: 0, relation: 'eq' }, hits: [] },
  aggregations: { conversations: { buckets: ids.map((key) => ({ key, doc_count: 1 })) } },
});

describe('rawIndexExpressionsFor', () => {
  it('collects the FROM targets of the ES|QL sources', () => {
    const sources: AiIndexSource[] = [
      { type: 'esql', value: 'FROM logs-app-1 | LIMIT 10' },
      { type: 'esql', value: 'FROM metrics-*, logs-app-2 | STATS count(*)' },
      { type: 'connector', value: 'my-connector' },
    ];

    expect(rawIndexExpressionsFor(sources)).toEqual(['logs-app-1', 'metrics-*', 'logs-app-2']);
  });

  it('returns nothing when no source names an index', () => {
    expect(rawIndexExpressionsFor([{ type: 'connector', value: 'my-connector' }])).toEqual([]);
  });
});

describe('selectSignals', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  const requestFor = (call: number): SearchRequest =>
    (esClient.search as unknown as jest.Mock).mock.calls[call][0] as SearchRequest;

  /** Call 0 resolves the co-occurrence conversations; call 1 is the selection itself. */
  const MAIN = 1;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  const run = (options: Partial<Parameters<typeof selectSignals>[1]> = {}) =>
    selectSignals(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [],
      sampleSize: 50,
      now: NOW,
      ...options,
    });

  it('takes every signal the window and filter admit, without restricting the signal type', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    await run();

    const { filter } = (requestFor(MAIN).query as { bool: { filter: unknown[] } }).bool;
    expect(filter).toEqual([
      { range: { '@timestamp': { gte: '2026-08-02T12:00:00.000Z', lte: NOW.toISOString() } } },
    ]);
    expect(JSON.stringify(filter)).not.toContain('signal_type');
  });

  it('attributes retrieval signals by matching the AI index destination', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    await run();

    expect(requestFor(MAIN).query).toMatchObject({
      bool: {
        minimum_should_match: 1,
        should: expect.arrayContaining([
          {
            bool: {
              filter: [
                { term: { signal_type: 'tool_call' } },
                { term: { 'data.query_kind': 'ki_retrieval' } },
                {
                  bool: {
                    should: [{ terms: { 'data.target_index': ['ai-index-idx-orders'] } }],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        ]),
        must_not: [{ term: { 'data.agent.class': 'management' } }],
      },
    });
  });

  it('matches a wildcard destination with a wildcard clause', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    await run({ destValue: 'ai-index-idx-orders-*' });

    expect(JSON.stringify(requestFor(MAIN).query)).toContain(
      JSON.stringify({ wildcard: { 'data.target_index': { value: 'ai-index-idx-orders-*' } } })
    );
  });

  it('attributes fallback signals by the raw indices the sources read', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    await run({ sources: [{ type: 'esql', value: 'FROM logs-app-1 | LIMIT 1' }] });

    expect(requestFor(MAIN).query).toMatchObject({
      bool: {
        should: expect.arrayContaining([
          {
            bool: {
              filter: [
                { term: { signal_type: 'tool_call' } },
                { term: { 'data.query_kind': 'raw_access' } },
                {
                  bool: {
                    should: [
                      {
                        bool: {
                          should: [{ terms: { 'data.target_index': ['logs-app-1'] } }],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        ]),
      },
    });
  });

  it('resolves co-occurrence conversations by aggregation, so it is not limited to the sample', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse(['conv-1', 'conv-2']) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    await run();

    expect(requestFor(0)).toMatchObject({
      size: 0,
      aggs: { conversations: { terms: { field: 'data.conversation_id', size: 1000 } } },
    });
    expect(JSON.stringify(requestFor(MAIN).query)).toContain(
      JSON.stringify({ terms: { 'data.conversation_id': ['conv-1', 'conv-2'] } })
    );
  });

  it('always admits signals that are not tool calls, since they carry nothing to attribute on', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    await run({ sources: [{ type: 'connector', value: 'my-connector' }] });

    expect(requestFor(MAIN).query).toMatchObject({
      bool: {
        should: expect.arrayContaining([
          { bool: { must_not: [{ term: { signal_type: 'tool_call' } }] } },
        ]),
      },
    });
  });

  it('buckets patterns on tags, so an untagged signal forms no pattern and a multi-tagged one forms several', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    await run();

    // `tags` is multi-valued, so a terms bucket over it fans a signal out across each of its tags
    // and produces nothing at all for a signal carrying none — the healthy-retrieval case.
    expect(requestFor(MAIN).aggs).toMatchObject({
      patterns: {
        terms: { field: 'tags' },
        aggs: {
          targets: {
            terms: { field: 'data.target_index' },
            aggs: { tools: { terms: { field: 'data.tool' } } },
          },
        },
      },
    });
    // No `missing` placeholder: a signal without these fields should form no pattern rather than
    // one keyed on values it never had.
    expect(JSON.stringify(requestFor(MAIN).aggs)).not.toContain('missing');
  });

  it('counts patterns from the aggregation rather than from the documents it read', async () => {
    esClient.search.mockResolvedValueOnce(conversationsResponse([]) as never).mockResolvedValueOnce(
      mainResponse({
        // One sampled document, but the window holds 4,200 signals in this pattern.
        patterns: [patternBucket('coverage_gap', 'logs-app-1', 'execute_esql', 4200)],
        signals: [
          buildSignal({
            id: 'a',
            tags: ['coverage_gap'],
            targetIndex: 'logs-app-1',
            queryKind: 'raw_access',
          }),
        ],
        total: 4200,
      }) as never
    );

    const result = await run();

    expect(result.patterns).toEqual([
      {
        tag: 'coverage_gap',
        target_index: 'logs-app-1',
        tool: 'execute_esql',
        count: 4200,
        signal_ids: ['a'],
        example: { row_count: 0 },
      },
    ]);
    expect(result.signalCount).toBe(4200);
  });

  it('still reports a pattern whose signals all fall outside the sample, without an example', async () => {
    esClient.search.mockResolvedValueOnce(conversationsResponse([]) as never).mockResolvedValueOnce(
      mainResponse({
        patterns: [patternBucket('query_error', 'logs-app-1', 'execute_esql', 7)],
        signals: [],
        total: 7,
      }) as never
    );

    const result = await run();

    expect(result.patterns).toEqual([
      {
        tag: 'query_error',
        target_index: 'logs-app-1',
        tool: 'execute_esql',
        count: 7,
        signal_ids: [],
      },
    ]);
  });

  it('prefers an example carrying an error message over a more recent one without', async () => {
    esClient.search.mockResolvedValueOnce(conversationsResponse([]) as never).mockResolvedValueOnce(
      mainResponse({
        patterns: [patternBucket('query_error', 'ai-index-idx-orders', 'execute_esql', 2)],
        signals: [
          buildSignal({ id: 'newest', tags: ['query_error'] }),
          buildSignal({ id: 'with-error', tags: ['query_error'], error: 'boom' }),
        ],
        total: 2,
      }) as never
    );

    const result = await run();

    expect(result.patterns[0].example?.error).toBe('boom');
    expect(result.patterns[0].signal_ids).toEqual(['newest', 'with-error']);
  });

  it('applies the configured KQL filter to both queries', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    await run({
      sources: [{ type: 'esql', value: 'FROM logs-app-1' }],
      signalFilter: 'tags: coverage_gap',
    });

    const filterClause = {
      bool: { should: [{ match: { tags: 'coverage_gap' } }], minimum_should_match: 1 },
    };
    expect(requestFor(0).query).toMatchObject({
      bool: { filter: expect.arrayContaining([filterClause]) },
    });
    expect(requestFor(MAIN).query).toMatchObject({
      bool: { filter: expect.arrayContaining([filterClause]) },
    });
  });

  it('reads every space and reports the ones the evidence came from', async () => {
    esClient.search.mockResolvedValueOnce(conversationsResponse([]) as never).mockResolvedValueOnce(
      mainResponse({
        spaces: ['context-engine-signals-marketing', 'context-engine-signals-default'],
      }) as never
    );

    const result = await run();

    expect(requestFor(MAIN)).toMatchObject({
      index: 'context-engine-signals-*',
      ignore_unavailable: true,
      allow_no_indices: true,
      track_total_hits: true,
    });
    expect(result.spaces).toEqual(['default', 'marketing']);
  });

  it('skips the conversation lookup when the destination matches nothing', async () => {
    esClient.search.mockResolvedValueOnce(mainResponse() as never);

    await run({ destValue: '' });

    expect(esClient.search).toHaveBeenCalledTimes(1);
  });

  it('reports the resolved window so the run records what it actually looked at', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    const result = await run({ signalTimeRange: { type: 'relative', from: 'now-1d' } });

    expect(result.window).toEqual({
      from: '2026-08-31T12:00:00.000Z',
      to: '2026-09-01T12:00:00.000Z',
    });
  });
});
