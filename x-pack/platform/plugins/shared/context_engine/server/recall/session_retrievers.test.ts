/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  RetrieverContainer,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SESSION_EVENTS_DATA_STREAM } from '../session_events/data_streams';
import { SESSION_MEMORY_DATA_STREAM } from '../session_memory/data_streams';
import { retrieveSessionEvents, retrieveSessionMemories } from './session_retrievers';

type Source = Readonly<Record<string, string | Readonly<Record<string, string>> | undefined>>;
interface MockHit {
  readonly _id?: string;
  readonly _source?: Source;
}

const isMockHit = (entry: Source | MockHit | undefined): entry is MockHit =>
  entry !== undefined && ('_id' in entry || '_source' in entry);

const defaultDocId = (source: Source | undefined, index: number): string =>
  typeof source?.id === 'string' && source.id.length > 0 ? `${source.id}-doc` : `doc-${index}`;

const searchResponse = (entries: Array<Source | MockHit | undefined>): SearchResponse<Source> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: {
    hits: entries.map((entry, index) =>
      isMockHit(entry)
        ? { _index: '.ds-test', _id: entry._id, _source: entry._source }
        : { _index: '.ds-test', _id: defaultDocId(entry, index), _source: entry }
    ),
  },
});

const hit = (docId: string, source: Source): MockHit => ({ _id: docId, _source: source });

const hybridRetriever = (
  query: string,
  filter: QueryDslQueryContainer[],
  rankWindowSize: number,
  mustNot: QueryDslQueryContainer[] = []
): RetrieverContainer => ({
  rrf: {
    retrievers: [
      { standard: { query: { match: { content: query } } } },
      { standard: { query: { match: { 'content.semantic_text': query } } } },
    ],
    filter: { bool: { filter, ...(mustNot.length > 0 ? { must_not: mustNot } : {}) } },
    rank_window_size: rankWindowSize,
  },
});

const event = (overrides: Source = {}): Source => ({
  id: 'event-1',
  session_id: 'session-1',
  type: 'user',
  event_at: '2026-11-09T09:00:00.000Z',
  '@timestamp': '2026-11-09T09:00:01.000Z',
  content: 'why is checkout-service slow?',
  ...overrides,
});

const memory = (overrides: Source = {}): Source => ({
  id: 'memory-1',
  session_id: 'session-1',
  '@timestamp': '2026-11-09T09:00:00.000Z',
  content: 'checkout-service latency comes from the connection pool limit',
  attributes: {},
  ...overrides,
});

const tombstone = (id: string, overrides: Source = {}): Source => ({
  id,
  session_id: 'session-1',
  '@timestamp': '2026-11-09T09:30:00.000Z',
  deleted_at: '2026-11-09T09:30:00.000Z',
  ...overrides,
});

describe('session retrievers', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const baseParams = { esClient, space: 'default', userId: 'jdoe', query: 'checkout latency' };

  const searchRequest = (call: number): SearchRequest => esClient.search.mock.calls[call][0] ?? {};

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('retrieveSessionEvents', () => {
    it('runs a scoped hybrid search over user and assistant messages', async () => {
      esClient.search.mockResolvedValue(searchResponse([]));

      await retrieveSessionEvents({ ...baseParams, size: 5 });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.search).toHaveBeenCalledWith({
        index: SESSION_EVENTS_DATA_STREAM,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 10,
        _source: ['id', 'session_id', 'type', 'event_at', '@timestamp', 'content'],
        retriever: hybridRetriever(
          'checkout latency',
          [
            { term: { space: 'default' } },
            { term: { user_id: 'jdoe' } },
            { terms: { type: ['user', 'assistant'] } },
          ],
          10
        ),
      });
    });

    it('limits the search to the deduplicated requested sessions', async () => {
      esClient.search.mockResolvedValue(searchResponse([]));

      await retrieveSessionEvents({
        ...baseParams,
        sessionIds: ['session-1', 'session-2', 'session-1'],
        size: 3,
      });

      expect(searchRequest(0).retriever).toEqual(
        hybridRetriever(
          'checkout latency',
          [
            { term: { space: 'default' } },
            { term: { user_id: 'jdoe' } },
            { terms: { session_id: ['session-1', 'session-2'] } },
            { terms: { type: ['user', 'assistant'] } },
          ],
          6
        )
      );
    });

    it.each([
      ['undefined', undefined],
      ['empty', []],
    ])('searches every session when sessionIds is %s', async (_, sessionIds) => {
      esClient.search.mockResolvedValue(searchResponse([]));

      await retrieveSessionEvents({ ...baseParams, sessionIds, size: 3 });

      expect(JSON.stringify(searchRequest(0).retriever)).not.toContain('session_id');
    });

    it('maps messages to recall results in rank order', async () => {
      esClient.search.mockResolvedValue(
        searchResponse([
          event({ id: 'event-2', type: 'assistant', content: 'the pool limit is 10' }),
          event(),
        ])
      );

      await expect(retrieveSessionEvents({ ...baseParams, size: 5 })).resolves.toEqual([
        {
          id: 'event-2',
          session_id: 'session-1',
          source: 'session_events',
          date: '2026-11-09T09:00:00.000Z',
          role: 'assistant',
          content: 'the pool limit is 10',
        },
        {
          id: 'event-1',
          session_id: 'session-1',
          source: 'session_events',
          date: '2026-11-09T09:00:00.000Z',
          role: 'user',
          content: 'why is checkout-service slow?',
        },
      ]);
    });

    it('dates an event by @timestamp when it has no event_at', async () => {
      esClient.search.mockResolvedValue(searchResponse([event({ event_at: undefined })]));

      const [result] = await retrieveSessionEvents({ ...baseParams, size: 5 });

      expect(result.date).toBe('2026-11-09T09:00:01.000Z');
    });

    it('keeps only the highest-ranked copy of a resent event', async () => {
      esClient.search.mockResolvedValue(
        searchResponse([
          event({ content: 'first ranked copy' }),
          event({ id: 'event-2' }),
          event({ content: 'lower ranked copy' }),
        ])
      );

      const results = await retrieveSessionEvents({ ...baseParams, size: 5 });

      expect(results.map(({ id, content }) => [id, content])).toEqual([
        ['event-1', 'first ranked copy'],
        ['event-2', 'why is checkout-service slow?'],
      ]);
    });

    it('keeps events that share an id across sessions', async () => {
      esClient.search.mockResolvedValue(
        searchResponse([
          event({ session_id: 'session-1' }),
          event({ session_id: 'session-2' }),
          event({ session_id: 'a:b', id: 'c' }),
          event({ session_id: 'a', id: 'b:c' }),
        ])
      );

      const results = await retrieveSessionEvents({ ...baseParams, size: 5 });

      expect(results.map(({ session_id: sessionId, id }) => [sessionId, id])).toEqual([
        ['session-1', 'event-1'],
        ['session-2', 'event-1'],
        ['a:b', 'c'],
        ['a', 'b:c'],
      ]);
    });

    it('skips events that are not recallable messages', async () => {
      esClient.search.mockResolvedValue(
        searchResponse([
          undefined,
          event({ id: 'tool', type: 'tool' }),
          event({ id: 'reasoning', type: 'reasoning' }),
          event({ id: 'empty', type: 'assistant', content: '' }),
          event({ id: 'missing-content', type: 'assistant', content: undefined }),
          event({ id: 'missing-session', session_id: undefined }),
          event({ id: undefined }),
          event({ id: 'undated', event_at: undefined, '@timestamp': undefined }),
          event({ id: 'kept' }),
        ])
      );

      const results = await retrieveSessionEvents({ ...baseParams, size: 5 });

      expect(results.map(({ id }) => id)).toEqual(['kept']);
    });

    it('returns at most size results', async () => {
      esClient.search.mockResolvedValue(
        searchResponse([
          event({ id: 'event-1' }),
          event({ id: 'event-2' }),
          event({ id: 'event-3' }),
          event({ id: 'event-4' }),
        ])
      );

      const results = await retrieveSessionEvents({ ...baseParams, size: 2 });

      expect(results.map(({ id }) => id)).toEqual(['event-1', 'event-2']);
    });

    it.each([0, -1])('returns nothing without searching when size is %d', async (size) => {
      await expect(retrieveSessionEvents({ ...baseParams, size })).resolves.toEqual([]);
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });

  describe('retrieveSessionMemories', () => {
    const mockSearches = (
      candidates: Array<Source | MockHit | undefined>,
      latest: Array<Source | MockHit>
    ): void => {
      esClient.search
        .mockResolvedValueOnce(searchResponse(candidates))
        .mockResolvedValueOnce(searchResponse(latest));
    };

    it('finds candidates with a scoped hybrid search', async () => {
      esClient.search.mockResolvedValue(searchResponse([]));

      await retrieveSessionMemories({ ...baseParams, size: 5 });

      expect(esClient.search).toHaveBeenCalledWith({
        index: SESSION_MEMORY_DATA_STREAM,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 10,
        _source: ['id'],
        retriever: hybridRetriever(
          'checkout latency',
          [{ term: { space: 'default' } }, { term: { user_id: 'jdoe' } }],
          10
        ),
      });
    });

    it('limits the candidate search to the deduplicated requested sessions', async () => {
      esClient.search.mockResolvedValue(searchResponse([]));

      await retrieveSessionMemories({
        ...baseParams,
        sessionIds: ['session-1', 'session-1', 'session-2'],
        size: 2,
      });

      expect(searchRequest(0).retriever).toEqual(
        hybridRetriever(
          'checkout latency',
          [
            { term: { space: 'default' } },
            { term: { user_id: 'jdoe' } },
            { terms: { session_id: ['session-1', 'session-2'] } },
          ],
          4
        )
      );
    });

    it('stops after the candidate search when nothing matches', async () => {
      esClient.search.mockResolvedValue(searchResponse([]));

      await expect(retrieveSessionMemories({ ...baseParams, size: 5 })).resolves.toEqual([]);
      expect(esClient.search).toHaveBeenCalledTimes(1);
    });

    it('reads the latest revision of every candidate across all sessions with tombstone tie-breaking', async () => {
      mockSearches(
        [
          hit('mem-1-v1', { id: 'memory-1' }),
          hit('mem-2-v1', { id: 'memory-2' }),
          hit('mem-1-v2', { id: 'memory-1' }),
        ],
        [hit('mem-1-v2', memory({ id: 'memory-1' })), hit('mem-2-v1', memory({ id: 'memory-2' }))]
      );

      await retrieveSessionMemories({ ...baseParams, sessionIds: ['session-1'], size: 5 });

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(esClient.search).toHaveBeenLastCalledWith({
        index: SESSION_MEMORY_DATA_STREAM,
        ignore_unavailable: true,
        allow_no_indices: true,
        allow_partial_search_results: false,
        size: 2,
        _source: ['id', 'session_id', '@timestamp', 'content', 'attributes', 'deleted_at'],
        query: {
          bool: {
            filter: [
              { terms: { id: ['memory-1', 'memory-2'] } },
              { term: { space: 'default' } },
              { term: { user_id: 'jdoe' } },
            ],
          },
        },
        collapse: { field: 'id' },
        sort: [{ '@timestamp': 'desc' }, { deleted_at: { order: 'desc', missing: '_last' } }],
      });
    });

    it('drops a memory whose latest revision is a tombstone', async () => {
      mockSearches(
        [{ id: 'memory-1' }, { id: 'memory-2' }, { id: 'memory-3' }],
        [
          tombstone('memory-1'),
          memory({ id: 'memory-2' }),
          memory({ id: 'memory-3', deleted_at: '2026-11-09T09:30:00.000Z' }),
        ]
      );

      const results = await retrieveSessionMemories({ ...baseParams, size: 5 });

      expect(results.map(({ id }) => id)).toEqual(['memory-2']);
    });

    it('drops phantom matches when only a stale revision matched the query', async () => {
      mockSearches(
        [hit('mem-1-v1', { id: 'memory-1' }), hit('mem-2-v1', { id: 'memory-2' })],
        [
          hit('mem-1-v2', memory({ id: 'memory-1', content: 'completely unrelated revision' })),
          hit('mem-2-v1', memory({ id: 'memory-2' })),
        ]
      );

      const results = await retrieveSessionMemories({ ...baseParams, size: 5 });

      expect(results.map(({ id }) => id)).toEqual(['memory-2']);
    });

    it('ranks a revised memory by its latest revision rather than a higher-scoring stale revision', async () => {
      mockSearches(
        [
          hit('mem-1-v1', { id: 'memory-1' }),
          hit('mem-2-v1', { id: 'memory-2' }),
          hit('mem-1-v2', { id: 'memory-1' }),
        ],
        [
          hit('mem-1-v2', memory({ id: 'memory-1', content: 'latest memory-1' })),
          hit('mem-2-v1', memory({ id: 'memory-2', content: 'latest memory-2' })),
        ]
      );

      const results = await retrieveSessionMemories({ ...baseParams, size: 5 });

      expect(results.map(({ id, content }) => [id, content])).toEqual([
        ['memory-2', 'latest memory-2'],
        ['memory-1', 'latest memory-1'],
      ]);
    });

    it('returns the latest revision of each memory in candidate rank order', async () => {
      mockSearches(
        [{ id: 'memory-2' }, { id: 'memory-1' }],
        [
          memory({
            id: 'memory-1',
            '@timestamp': '2026-11-09T11:00:00.000Z',
            content: 'the pool limit was raised in 3.2.1',
            attributes: { incident: 'INC-4211' },
          }),
          memory({ id: 'memory-2', content: 'checkout-service runs on three replicas' }),
        ]
      );

      await expect(retrieveSessionMemories({ ...baseParams, size: 5 })).resolves.toEqual([
        {
          id: 'memory-2',
          session_id: 'session-1',
          source: 'session_memory',
          date: '2026-11-09T09:00:00.000Z',
          content: 'checkout-service runs on three replicas',
        },
        {
          id: 'memory-1',
          session_id: 'session-1',
          source: 'session_memory',
          date: '2026-11-09T11:00:00.000Z',
          content: 'the pool limit was raised in 3.2.1',
          attributes: { incident: 'INC-4211' },
        },
      ]);
    });

    it('omits attributes when a memory has none', async () => {
      mockSearches(
        [{ id: 'memory-1' }, { id: 'memory-2' }],
        [
          memory({ id: 'memory-1', attributes: {} }),
          memory({ id: 'memory-2', attributes: undefined }),
        ]
      );

      const results = await retrieveSessionMemories({ ...baseParams, size: 5 });

      expect(results).toHaveLength(2);
      results.forEach((result) => expect(result).not.toHaveProperty('attributes'));
    });

    it('drops a memory whose latest revision moved out of the requested sessions', async () => {
      mockSearches(
        [{ id: 'memory-1' }, { id: 'memory-2' }],
        [memory({ id: 'memory-1', session_id: 'session-9' }), memory({ id: 'memory-2' })]
      );

      const results = await retrieveSessionMemories({
        ...baseParams,
        sessionIds: ['session-1'],
        size: 5,
      });

      expect(results.map(({ id }) => id)).toEqual(['memory-2']);
    });

    it('skips candidates with no readable latest revision', async () => {
      mockSearches(
        [undefined, {}, { id: 'missing' }, { id: 'empty' }, { id: 'kept' }],
        [memory({ id: 'empty', content: '' }), memory({ id: 'kept' })]
      );

      const results = await retrieveSessionMemories({ ...baseParams, size: 5 });

      expect(results.map(({ id }) => id)).toEqual(['kept']);
    });

    it('refills when tombstones and stale revisions fill the first window without re-querying cached ids', async () => {
      esClient.search
        .mockResolvedValueOnce(
          searchResponse([
            hit('dead-1-v1', { id: 'dead-1' }),
            hit('dead-2-v1', { id: 'dead-2' }),
            hit('revised-v1', { id: 'revised' }),
            hit('kept-1-v1', { id: 'kept-1' }),
          ])
        )
        .mockResolvedValueOnce(
          searchResponse([
            hit('dead-1-tomb', tombstone('dead-1')),
            hit('dead-2-tomb', tombstone('dead-2')),
            hit('revised-v2', memory({ id: 'revised', content: 'updated revision' })),
            hit('kept-1-v1', memory({ id: 'kept-1', content: 'first live memory' })),
          ])
        )
        .mockResolvedValueOnce(
          searchResponse([hit('revised-v2', { id: 'revised' }), hit('kept-2-v1', { id: 'kept-2' })])
        )
        .mockResolvedValueOnce(
          searchResponse([
            hit('kept-2-v1', memory({ id: 'kept-2', content: 'second live memory' })),
          ])
        );

      const results = await retrieveSessionMemories({ ...baseParams, size: 2 });

      expect(results.map(({ id, content }) => [id, content])).toEqual([
        ['kept-1', 'first live memory'],
        ['revised', 'updated revision'],
      ]);
      expect(esClient.search).toHaveBeenCalledTimes(4);
      expect(searchRequest(2).retriever).toEqual(
        hybridRetriever(
          'checkout latency',
          [{ term: { space: 'default' } }, { term: { user_id: 'jdoe' } }],
          4,
          [{ terms: { id: ['dead-1', 'dead-2', 'kept-1'] } }, { ids: { values: ['revised-v1'] } }]
        )
      );
      expect(searchRequest(3).query).toEqual({
        bool: {
          filter: [
            { terms: { id: ['kept-2'] } },
            { term: { space: 'default' } },
            { term: { user_id: 'jdoe' } },
          ],
        },
      });
    });

    it('skips the second collapse query when every refill candidate is already cached', async () => {
      esClient.search
        .mockResolvedValueOnce(
          searchResponse([hit('revised-v1', { id: 'revised' }), hit('dead-1-v1', { id: 'dead-1' })])
        )
        .mockResolvedValueOnce(
          searchResponse([
            hit('revised-v2', memory({ id: 'revised', content: 'updated revision' })),
            hit('dead-1-tomb', tombstone('dead-1')),
          ])
        )
        .mockResolvedValueOnce(searchResponse([hit('revised-v2', { id: 'revised' })]));

      const results = await retrieveSessionMemories({ ...baseParams, size: 1 });

      expect(results.map(({ id, content }) => [id, content])).toEqual([
        ['revised', 'updated revision'],
      ]);
      expect(esClient.search).toHaveBeenCalledTimes(3);
    });

    it('stops after the maximum number of refill rounds when tombstones keep filling the window', async () => {
      const deadRound = (prefix: string) => {
        esClient.search
          .mockResolvedValueOnce(
            searchResponse([
              hit(`${prefix}-1-v1`, { id: `${prefix}-1` }),
              hit(`${prefix}-2-v1`, { id: `${prefix}-2` }),
            ])
          )
          .mockResolvedValueOnce(
            searchResponse([
              hit(`${prefix}-1-tomb`, tombstone(`${prefix}-1`)),
              hit(`${prefix}-2-tomb`, tombstone(`${prefix}-2`)),
            ])
          );
      };
      deadRound('r1');
      deadRound('r2');
      deadRound('r3');

      await expect(retrieveSessionMemories({ ...baseParams, size: 1 })).resolves.toEqual([]);
      expect(esClient.search).toHaveBeenCalledTimes(6);
    });

    it('returns at most size live memories', async () => {
      mockSearches(
        [{ id: 'memory-1' }, { id: 'memory-2' }, { id: 'memory-3' }, { id: 'memory-4' }],
        [
          tombstone('memory-1'),
          memory({ id: 'memory-2' }),
          memory({ id: 'memory-3' }),
          memory({ id: 'memory-4' }),
        ]
      );

      const results = await retrieveSessionMemories({ ...baseParams, size: 2 });

      expect(results.map(({ id }) => id)).toEqual(['memory-2', 'memory-3']);
      expect(esClient.search).toHaveBeenCalledTimes(2);
    });

    it.each([0, -1])('returns nothing without searching when size is %d', async (size) => {
      await expect(retrieveSessionMemories({ ...baseParams, size })).resolves.toEqual([]);
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });

  describe('scope validation', () => {
    it.each([
      ['empty space', { space: '', userId: 'jdoe' }, /space/],
      ['blank space', { space: '   ', userId: 'jdoe' }, /space/],
      ['empty userId', { space: 'default', userId: '' }, /userId/],
      ['blank userId', { space: 'default', userId: '   ' }, /userId/],
    ])('rejects %s before calling Elasticsearch', async (_, invalidScope, pattern) => {
      const params = { ...baseParams, ...invalidScope, size: 5 };

      await expect(retrieveSessionEvents(params)).rejects.toThrow(pattern);
      await expect(retrieveSessionMemories(params)).rejects.toThrow(pattern);
      await expect(retrieveSessionEvents({ ...params, size: 0 })).rejects.toThrow(pattern);
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });
});
