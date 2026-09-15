/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { AiIndexSource } from '../../common/http_api/ai_indices';
import { rawIndexExpressionsFor, selectSignals } from './select_signals';

const NOW = new Date('2026-09-01T12:00:00.000Z');

/** One `top_hits` hit, carrying only the `_source` fields the evidence projection asks for. */
const evidenceHit = (overrides: {
  id: string;
  query?: string;
  error?: string;
  rowCount?: number;
  conversationId?: string;
}) => ({
  _source: {
    signal_id: overrides.id,
    data: {
      returned: { row_count: overrides.rowCount ?? 0 },
      ...(overrides.query ? { query: overrides.query } : {}),
      ...(overrides.error ? { error: overrides.error } : {}),
      ...(overrides.conversationId ? { conversation_id: overrides.conversationId } : {}),
    },
  },
});

// A `multi_terms` bucket is keyed by the ordered tuple of its term values.
const patternBucket = (
  tag: string,
  target: string,
  tool: string,
  count: number,
  evidence: Array<ReturnType<typeof evidenceHit>> = []
) => ({
  key: [tag, target, tool],
  doc_count: count,
  evidence: { hits: { hits: evidence } },
});

// `spaces` keys are backing index names, which is what a `_index` terms agg buckets on.
const mainResponse = ({
  patterns = [],
  spaces = ['context-engine-signals-default-000001'],
  total = 0,
}: {
  patterns?: ReturnType<typeof patternBucket>[];
  spaces?: string[];
  total?: number;
} = {}) => ({
  hits: { total: { value: total, relation: 'eq' }, hits: [] },
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

  const MAIN = 1;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  const run = (options: Partial<Parameters<typeof selectSignals>[1]> = {}) =>
    selectSignals(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [],
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

  it('buckets patterns on the whole (tag, target index, tool) triple in one aggregation', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    await run();

    expect(requestFor(MAIN).aggs).toMatchObject({
      patterns: {
        multi_terms: {
          terms: [{ field: 'tags' }, { field: 'data.target_index' }, { field: 'data.tool' }],
          order: { _count: 'desc' },
        },
      },
    });
  });

  it('leaves signals that carry no target index or tool out of the patterns entirely', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    await run();

    // `multi_terms` drops a document missing any of its terms unless that term declares a
    // `missing` placeholder. That is the intended behaviour: the triple is the shape of a tool
    // call, and a signal without one belongs to no pattern rather than to an invented one.
    expect(JSON.stringify(requestFor(MAIN).aggs)).not.toContain('missing');
  });

  it('reads no documents outside the aggregation, so nothing depends on a sample', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(mainResponse() as never);

    await run();

    expect(requestFor(MAIN).size).toBe(0);
    expect(requestFor(MAIN).aggs).toMatchObject({
      patterns: {
        aggs: {
          evidence: {
            top_hits: {
              size: 20,
              sort: [{ '@timestamp': { order: 'desc' } }, { signal_id: { order: 'desc' } }],
              _source: {
                includes: [
                  'signal_id',
                  'data.query',
                  'data.error',
                  'data.returned.row_count',
                  'data.conversation_id',
                ],
              },
            },
          },
        },
      },
    });
  });

  it('counts patterns from the aggregation rather than from the documents it read', async () => {
    esClient.search.mockResolvedValueOnce(conversationsResponse([]) as never).mockResolvedValueOnce(
      mainResponse({
        patterns: [
          patternBucket('coverage_gap', 'logs-app-1', 'execute_esql', 4200, [
            evidenceHit({ id: 'a' }),
          ]),
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

  it('gives a rare pattern the same evidence as a common one, since each bucket carries its own', async () => {
    esClient.search.mockResolvedValueOnce(conversationsResponse([]) as never).mockResolvedValueOnce(
      mainResponse({
        patterns: [
          patternBucket('query_error', 'logs-app-1', 'execute_esql', 4200, [
            evidenceHit({ id: 'common', error: 'syntax' }),
          ]),
          patternBucket('coverage_gap', 'logs-app-2', 'execute_esql', 1, [
            evidenceHit({ id: 'rare', query: 'FROM logs-app-2' }),
          ]),
        ],
        total: 4201,
      }) as never
    );

    const result = await run();

    // The rare pattern would previously have lost its evidence to the draw: one document in a
    // window whose sample was capped well below its size.
    expect(result.patterns.map(({ count, signal_ids: ids }) => ({ count, ids }))).toEqual([
      { count: 4200, ids: ['common'] },
      { count: 1, ids: ['rare'] },
    ]);
    expect(result.patterns[1].example).toEqual({ query: 'FROM logs-app-2', row_count: 0 });
  });

  it('prefers an example carrying an error message over a more recent one without', async () => {
    esClient.search.mockResolvedValueOnce(conversationsResponse([]) as never).mockResolvedValueOnce(
      mainResponse({
        patterns: [
          patternBucket('query_error', 'ai-index-idx-orders', 'execute_esql', 2, [
            evidenceHit({ id: 'newest' }),
            evidenceHit({ id: 'with-error', error: 'boom' }),
          ]),
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
        spaces: [
          'context-engine-signals-marketing-000001',
          'context-engine-signals-default-000001',
        ],
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

  it('reports a space once when its signals span more than one backing index', async () => {
    esClient.search.mockResolvedValueOnce(conversationsResponse([]) as never).mockResolvedValueOnce(
      mainResponse({
        spaces: [
          'context-engine-signals-marketing-000001',
          'context-engine-signals-marketing-000002',
        ],
      }) as never
    );

    const result = await run();

    expect(result.spaces).toEqual(['marketing']);
  });

  it('keeps a space id that itself ends in digits', async () => {
    esClient.search
      .mockResolvedValueOnce(conversationsResponse([]) as never)
      .mockResolvedValueOnce(
        mainResponse({ spaces: ['context-engine-signals-team-2026-000001'] }) as never
      );

    const result = await run();

    expect(result.spaces).toEqual(['team-2026']);
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
