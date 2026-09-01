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
}): Signal =>
  ({
    signal_id: overrides.id,
    '@timestamp': overrides.timestamp ?? '2026-09-01T11:00:00.000Z',
    signal_type: 'tool_call',
    tags: [],
    data: {
      tool: 'execute_esql',
      query_kind: overrides.queryKind ?? 'ki_retrieval',
      target_index: overrides.targetIndex ?? 'ai-index-idx-orders',
      status: 'Ok',
      ...(overrides.conversationId ? { conversation_id: overrides.conversationId } : {}),
    },
  } as unknown as Signal);

const hitsFor = (signals: Signal[], index = 'context-engine-signals-default') => ({
  hits: {
    hits: signals.map((signal) => ({ _index: index, _id: signal.signal_id, _source: signal })),
  },
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

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('attributes retrieval signals by matching the AI index destination', async () => {
    esClient.search
      .mockResolvedValueOnce(hitsFor([buildSignal({ id: 'a' })]) as never)
      .mockResolvedValueOnce(hitsFor([]) as never);

    const result = await selectSignals(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [],
      size: 50,
      now: NOW,
    });

    expect(result.signals.map(({ signal_id: id }) => id)).toEqual(['a']);
    expect(requestFor(0).query).toMatchObject({
      bool: {
        filter: expect.arrayContaining([
          { range: { '@timestamp': { gte: '2026-08-02T12:00:00.000Z', lte: NOW.toISOString() } } },
          { term: { signal_type: 'tool_call' } },
          { term: { 'data.query_kind': 'ki_retrieval' } },
          {
            bool: {
              should: [{ terms: { 'data.target_index': ['ai-index-idx-orders'] } }],
              minimum_should_match: 1,
            },
          },
        ]),
        must_not: [{ term: { 'data.agent.class': 'management' } }],
      },
    });
  });

  it('matches a wildcard destination with a wildcard clause', async () => {
    esClient.search.mockResolvedValue(hitsFor([]) as never);

    await selectSignals(esClient, {
      destValue: 'ai-index-idx-orders-*',
      sources: [],
      size: 50,
      now: NOW,
    });

    expect(requestFor(0).query).toMatchObject({
      bool: {
        filter: expect.arrayContaining([
          {
            bool: {
              should: [{ wildcard: { 'data.target_index': { value: 'ai-index-idx-orders-*' } } }],
              minimum_should_match: 1,
            },
          },
        ]),
      },
    });
  });

  it('attributes fallback signals by the raw indices the sources read', async () => {
    esClient.search
      .mockResolvedValueOnce(hitsFor([]) as never)
      .mockResolvedValueOnce(
        hitsFor([
          buildSignal({ id: 'raw', queryKind: 'raw_access', targetIndex: 'logs-app-1' }),
        ]) as never
      );

    const result = await selectSignals(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [{ type: 'esql', value: 'FROM logs-app-1 | LIMIT 1' }],
      size: 50,
      now: NOW,
    });

    expect(result.signals.map(({ signal_id: id }) => id)).toEqual(['raw']);
    expect(requestFor(1).query).toMatchObject({
      bool: {
        filter: expect.arrayContaining([
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
        ]),
      },
    });
  });

  it('also attributes fallbacks by conversations the retrieval pass already tied to this index', async () => {
    esClient.search
      .mockResolvedValueOnce(hitsFor([buildSignal({ id: 'a', conversationId: 'conv-1' })]) as never)
      .mockResolvedValueOnce(hitsFor([]) as never);

    await selectSignals(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [],
      size: 50,
      now: NOW,
    });

    expect(requestFor(1).query).toMatchObject({
      bool: {
        filter: expect.arrayContaining([
          {
            bool: {
              should: [{ terms: { 'data.conversation_id': ['conv-1'] } }],
              minimum_should_match: 1,
            },
          },
        ]),
      },
    });
  });

  it('skips the fallback pass when there is nothing to attribute it by', async () => {
    esClient.search.mockResolvedValueOnce(hitsFor([buildSignal({ id: 'a' })]) as never);

    await selectSignals(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [{ type: 'connector', value: 'my-connector' }],
      size: 50,
      now: NOW,
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
  });

  it('applies the configured KQL filter to both passes', async () => {
    esClient.search.mockResolvedValue(hitsFor([]) as never);

    await selectSignals(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [{ type: 'esql', value: 'FROM logs-app-1' }],
      signalFilter: 'tags: coverage_gap',
      size: 50,
      now: NOW,
    });

    const filterClause = {
      bool: { should: [{ match: { tags: 'coverage_gap' } }], minimum_should_match: 1 },
    };
    expect(requestFor(0).query).toMatchObject({
      bool: { filter: expect.arrayContaining([filterClause]) },
    });
    expect(requestFor(1).query).toMatchObject({
      bool: { filter: expect.arrayContaining([filterClause]) },
    });
  });

  it('reads every space and reports the ones the evidence came from', async () => {
    esClient.search
      .mockResolvedValueOnce({
        hits: {
          hits: [
            { _index: 'context-engine-signals-default', _source: buildSignal({ id: 'a' }) },
            { _index: 'context-engine-signals-marketing', _source: buildSignal({ id: 'b' }) },
          ],
        },
      } as never)
      .mockResolvedValueOnce(hitsFor([]) as never);

    const result = await selectSignals(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [],
      size: 50,
      now: NOW,
    });

    expect(requestFor(0)).toMatchObject({
      index: 'context-engine-signals-*',
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    expect(result.spaces).toEqual(['default', 'marketing']);
  });

  it('deduplicates a signal caught by both passes', async () => {
    const shared = buildSignal({ id: 'shared', queryKind: 'raw_access' });
    esClient.search
      .mockResolvedValueOnce(hitsFor([shared]) as never)
      .mockResolvedValueOnce(hitsFor([shared]) as never);

    const result = await selectSignals(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [{ type: 'esql', value: 'FROM logs-app-1' }],
      size: 50,
      now: NOW,
    });

    expect(result.signals).toHaveLength(1);
  });

  it('keeps the newest signals when the merged result exceeds the cap', async () => {
    esClient.search
      .mockResolvedValueOnce(
        hitsFor([
          buildSignal({ id: 'old', timestamp: '2026-08-30T00:00:00.000Z' }),
          buildSignal({ id: 'new', timestamp: '2026-09-01T00:00:00.000Z' }),
        ]) as never
      )
      .mockResolvedValueOnce(hitsFor([]) as never);

    const result = await selectSignals(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [],
      size: 1,
      now: NOW,
    });

    expect(result.signals.map(({ signal_id: id }) => id)).toEqual(['new']);
  });

  it('reports the resolved window so the run records what it actually looked at', async () => {
    esClient.search.mockResolvedValue(hitsFor([]) as never);

    const result = await selectSignals(esClient, {
      destValue: 'ai-index-idx-orders',
      sources: [],
      signalTimeRange: { type: 'relative', from: 'now-1d' },
      size: 50,
      now: NOW,
    });

    expect(result.window).toEqual({
      from: '2026-08-31T12:00:00.000Z',
      to: '2026-09-01T12:00:00.000Z',
    });
  });
});
