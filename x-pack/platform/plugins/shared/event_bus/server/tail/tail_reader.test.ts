/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { readBatch } from './tail_reader';

const hit = (ts: number, id: string, type = 'rule.created') => ({
  _source: {
    '@timestamp': new Date(ts).toISOString(),
    event: { id, type },
    target: 'all',
    source: 'node-a',
    payload: { hello: 'world' },
  },
  sort: [ts, id],
});

const makeEsClient = (hits: ReturnType<typeof hit>[]) => {
  const search = jest.fn().mockResolvedValue({ hits: { hits } });
  return { esClient: { search } as unknown as ElasticsearchClient, search };
};

describe('readBatch', () => {
  const NOW = 10_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('applies the safety lag as an @timestamp upper bound and prunes with a lower bound', async () => {
    const { esClient, search } = makeEsClient([]);

    await readBatch({
      esClient,
      index: '.kibana-event-bus-ds',
      filter: [{ terms: { 'event.type': ['rule.created'] } }],
      cursor: [5_000, 'evt-5'],
      startTs: 0,
      safetyLagMs: 2_000,
      batchSize: 500,
      signal: undefined,
    });

    const [request, options] = search.mock.calls[0];
    expect(request.track_total_hits).toBe(false);
    expect(request.size).toBe(500);
    expect(request.sort).toEqual([{ '@timestamp': 'asc' }, { 'event.id': 'asc' }]);
    expect(request.search_after).toEqual([5_000, 'evt-5']);
    expect(request.query.bool.filter[0]).toEqual({
      range: {
        '@timestamp': { gte: 5_000, lte: NOW - 2_000 },
      },
    });
    // user filters are preserved after the range filter
    expect(request.query.bool.filter[1]).toEqual({ terms: { 'event.type': ['rule.created'] } });
    expect(options).toEqual({ signal: undefined });
  });

  it('starts from startTs (with empty tiebreaker) when there is no cursor', async () => {
    const { esClient, search } = makeEsClient([]);

    await readBatch({
      esClient,
      index: '.kibana-event-bus-ds',
      filter: [],
      cursor: null,
      startTs: 4_242,
      safetyLagMs: 0,
      batchSize: 10,
    });

    const [request] = search.mock.calls[0];
    expect(request.search_after).toEqual([4_242, '']);
    expect(request.query.bool.filter[0].range['@timestamp'].gte).toBe(4_242);
  });

  it('maps hits to BusEvents and derives the next cursor from the last hit', async () => {
    const { esClient } = makeEsClient([hit(6_000, 'evt-6'), hit(7_000, 'evt-7')]);

    const result = await readBatch({
      esClient,
      index: '.kibana-event-bus-ds',
      filter: [],
      cursor: null,
      startTs: 0,
      safetyLagMs: 0,
      batchSize: 500,
    });

    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toEqual({
      id: 'evt-6',
      type: 'rule.created',
      target: 'all',
      source: 'node-a',
      space: undefined,
      partition: undefined,
      payload: { hello: 'world' },
      timestamp: new Date(6_000).toISOString(),
    });
    expect(result.nextCursor).toEqual([7_000, 'evt-7']);
    expect(result.hasMore).toBe(false);
  });

  it('reports hasMore and keeps the previous cursor when the batch is empty', async () => {
    const { esClient } = makeEsClient(
      Array.from({ length: 3 }, (_, i) => hit(1_000 + i, `evt-${i}`))
    );

    const full = await readBatch({
      esClient,
      index: '.kibana-event-bus-ds',
      filter: [],
      cursor: null,
      startTs: 0,
      safetyLagMs: 0,
      batchSize: 3,
    });
    expect(full.hasMore).toBe(true);

    const { esClient: emptyClient } = makeEsClient([]);
    const empty = await readBatch({
      esClient: emptyClient,
      index: '.kibana-event-bus-ds',
      filter: [],
      cursor: [9, 'evt-last'],
      startTs: 0,
      safetyLagMs: 0,
      batchSize: 3,
    });
    expect(empty.events).toEqual([]);
    expect(empty.nextCursor).toEqual([9, 'evt-last']);
    expect(empty.hasMore).toBe(false);
  });
});
