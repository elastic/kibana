/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  QueryDslQueryContainer,
  SearchRequest,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { AiIndexItem, AiIndexType } from '../../common/http_api/ai_indices';
import type { KiJsonValue } from '../../common/http_api/knowledge_indicators';
import { buildAiIndexSpaceFilter, buildAiIndexUserFilter } from '../../common/space_filter';
import { filterReadableAiIndices } from '../ai_indices/filter_readable_ai_indices';
import { retrieveAiIndices, type AiIndexRecallParams } from './ai_index_retriever';

jest.mock('../ai_indices/filter_readable_ai_indices');

const filterReadableAiIndicesMock = jest.mocked(filterReadableAiIndices);

type Source = Readonly<Record<string, KiJsonValue | undefined>>;

interface MockHit {
  readonly _index: string;
  readonly _id: string;
  readonly _source?: Source;
}

const aiIndex = (id: string, type: AiIndexType, value: string): AiIndexItem => ({
  id,
  dest: { type, value },
  managed: false,
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
});

const searchResponse = (hits: readonly MockHit[]): SearchResponse<Source> => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, failed: 0 },
  hits: { hits: [...hits] },
});

const hit = (index: string, docId: string, source?: Source): MockHit => ({
  _index: index,
  _id: docId,
  _source: source,
});

const ki = (id: string | undefined, overrides: Source = {}): Source => ({
  id,
  updated_at: '2026-11-20T10:00:00.000Z',
  '@timestamp': '2026-11-20T09:00:00.000Z',
  content: `content of ${id}`,
  ...overrides,
});

const PLAIN = aiIndex('plain', 'index', 'ai-index-idx-plain');
const OTHER_PLAIN = aiIndex('other', 'index', 'ai-index-idx-other');
const STREAM = aiIndex('stream', 'data_stream', 'ai-index-ds-foo');
const STREAM_BACKING = '.ds-ai-index-ds-foo-2026.11.20-000001';

const ACTIVE_FILTER: QueryDslQueryContainer = {
  bool: {
    should: [
      { bool: { must_not: [{ exists: { field: 'governance.lifecycle.status' } }] } },
      { term: { 'governance.lifecycle.status': 'active' } },
    ],
    minimum_should_match: 1,
  },
};

const UNEXPIRED_FILTER: QueryDslQueryContainer = {
  bool: {
    should: [
      { bool: { must_not: [{ exists: { field: 'expires_at' } }] } },
      { range: { expires_at: { gt: 'now' } } },
    ],
    minimum_should_match: 1,
  },
};

const excludeDocs = (index: string, docIds: string[]): QueryDslQueryContainer => ({
  bool: { filter: [{ term: { _index: index } }, { ids: { values: docIds } }] },
});

describe('retrieveAiIndices', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const aiIndexService = { list: jest.fn() };
  const logger = loggingSystemMock.createLogger();
  const baseParams: AiIndexRecallParams = {
    esClient,
    aiIndexService,
    logger,
    space: 'default',
    userId: 'jdoe',
    query: 'checkout latency',
    selector: { kind: 'all' },
    size: 5,
  };

  const searchRequest = (call: number): SearchRequest => {
    const request = esClient.search.mock.calls[call]?.[0];
    if (!request) {
      throw new Error(`Expected esClient.search call #${call} with a request body`);
    }
    return request;
  };
  const searchedIndices = (call: number) => searchRequest(call).index;

  const givenAiIndices = (...aiIndices: AiIndexItem[]): void => {
    aiIndexService.list.mockResolvedValue(aiIndices);
  };

  const mockSearches = (...responses: Array<readonly MockHit[]>): void => {
    for (const hits of responses) {
      esClient.search.mockResolvedValueOnce(searchResponse(hits));
    }
  };

  beforeEach(() => {
    jest.resetAllMocks();
    filterReadableAiIndicesMock.mockImplementation(async ({ aiIndices }) => aiIndices);
  });

  describe('early exits', () => {
    it('returns nothing without listing AI indices when the selector is none', async () => {
      await expect(
        retrieveAiIndices({ ...baseParams, selector: { kind: 'none' } })
      ).resolves.toEqual([]);
      expect(aiIndexService.list).not.toHaveBeenCalled();
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it.each([0, -1])('returns nothing without listing AI indices when size is %d', async (size) => {
      await expect(retrieveAiIndices({ ...baseParams, size })).resolves.toEqual([]);
      expect(aiIndexService.list).not.toHaveBeenCalled();
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it.each([
      ['empty space', { space: '', userId: 'jdoe' }, /space/],
      ['blank space', { space: '   ', userId: 'jdoe' }, /space/],
      ['empty userId', { space: 'default', userId: '' }, /userId/],
      ['blank userId', { space: 'default', userId: '   ' }, /userId/],
    ])('rejects %s before calling any service', async (_, invalidScope, pattern) => {
      await expect(retrieveAiIndices({ ...baseParams, ...invalidScope })).rejects.toThrow(pattern);
      await expect(retrieveAiIndices({ ...baseParams, ...invalidScope, size: 0 })).rejects.toThrow(
        pattern
      );
      expect(aiIndexService.list).not.toHaveBeenCalled();
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });

  describe('target selection', () => {
    it('searches every AI index of the space when the selector is all', async () => {
      givenAiIndices(PLAIN, OTHER_PLAIN);
      mockSearches([]);

      await retrieveAiIndices(baseParams);

      expect(aiIndexService.list).toHaveBeenCalledWith('default');
      expect(searchedIndices(0)).toEqual(['ai-index-idx-plain', 'ai-index-idx-other']);
    });

    it('searches only the requested AI indices and ignores unknown ids', async () => {
      givenAiIndices(PLAIN, OTHER_PLAIN);
      mockSearches([]);

      await retrieveAiIndices({
        ...baseParams,
        selector: { kind: 'ids', ids: ['other', 'unknown'] },
      });

      expect(filterReadableAiIndicesMock).toHaveBeenCalledWith({
        esClient,
        aiIndices: [OTHER_PLAIN],
        logger,
      });
      expect(searchedIndices(0)).toEqual(['ai-index-idx-other']);
    });

    it('returns nothing without probing when only unknown ids are requested', async () => {
      givenAiIndices(PLAIN);

      await expect(
        retrieveAiIndices({ ...baseParams, selector: { kind: 'ids', ids: ['unknown'] } })
      ).resolves.toEqual([]);
      expect(filterReadableAiIndicesMock).not.toHaveBeenCalled();
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('drops AI indices the caller cannot read', async () => {
      givenAiIndices(PLAIN, OTHER_PLAIN);
      filterReadableAiIndicesMock.mockResolvedValue([OTHER_PLAIN]);
      mockSearches([]);

      await retrieveAiIndices(baseParams);

      expect(searchedIndices(0)).toEqual(['ai-index-idx-other']);
    });

    it('returns nothing without searching when no AI index is readable', async () => {
      givenAiIndices(PLAIN);
      filterReadableAiIndicesMock.mockResolvedValue([]);

      await expect(retrieveAiIndices(baseParams)).resolves.toEqual([]);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('returns nothing when the whole readability probe is refused with a 403', async () => {
      givenAiIndices(PLAIN);
      filterReadableAiIndicesMock.mockRejectedValue(
        new errors.ResponseError(
          elasticsearchClientMock.createApiResponse({
            statusCode: 403,
            body: { error: { type: 'security_exception', reason: 'unauthorized' } },
          })
        )
      );

      await expect(retrieveAiIndices(baseParams)).resolves.toEqual([]);
      expect(logger.debug).toHaveBeenCalled();
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('propagates readability probe failures other than a 403', async () => {
      givenAiIndices(PLAIN);
      const unavailable = new errors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 503,
          body: { error: { type: 'unavailable', reason: 'cluster unavailable' } },
        })
      );
      filterReadableAiIndicesMock.mockRejectedValue(unavailable);

      await expect(retrieveAiIndices(baseParams)).rejects.toBe(unavailable);
    });

    it('searches a shared backing target once and maps hits to the first AI index', async () => {
      givenAiIndices(PLAIN, aiIndex('alias', 'index', 'ai-index-idx-plain'));
      mockSearches([hit('ai-index-idx-plain', 'doc-1', ki('ki-1'))]);

      const results = await retrieveAiIndices(baseParams);

      expect(searchedIndices(0)).toEqual(['ai-index-idx-plain']);
      expect(results.map(({ source }) => source)).toEqual(['ai_index:plain']);
    });
  });

  describe('hybrid search', () => {
    it.each([
      ['plain indices', [PLAIN], 5],
      ['data streams', [PLAIN, STREAM], 10],
    ])('runs one scoped hybrid search over %s', async (_, aiIndices, expectedSize) => {
      givenAiIndices(...aiIndices);
      mockSearches([]);

      await retrieveAiIndices(baseParams);

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.search).toHaveBeenCalledWith({
        index: aiIndices.map(({ dest }) => dest.value),
        ignore_unavailable: true,
        allow_no_indices: true,
        size: expectedSize,
        _source: ['id', 'updated_at', '@timestamp', 'content', 'attributes'],
        retriever: {
          rrf: {
            retrievers: [
              { standard: { query: { match: { content: 'checkout latency' } } } },
              { standard: { query: { match: { 'content.semantic': 'checkout latency' } } } },
            ],
            filter: {
              bool: {
                filter: [
                  buildAiIndexSpaceFilter('default'),
                  buildAiIndexUserFilter('jdoe'),
                  ACTIVE_FILTER,
                  UNEXPIRED_FILTER,
                ],
              },
            },
            rank_window_size: 10,
          },
        },
      });
    });
  });

  describe('plain indices', () => {
    it('maps hits to recall results in rank order without verifying revisions', async () => {
      givenAiIndices(PLAIN, OTHER_PLAIN);
      mockSearches([
        hit('ai-index-idx-other', 'doc-2', ki('ki-2', { attributes: { service: 'checkout' } })),
        hit(
          'ai-index-idx-plain',
          'legacy-doc',
          ki(undefined, { updated_at: undefined, content: 'legacy content' })
        ),
        hit(
          'ai-index-idx-plain',
          'doc-3',
          ki('ki-3', { updated_at: undefined, '@timestamp': undefined })
        ),
      ]);

      await expect(retrieveAiIndices(baseParams)).resolves.toEqual([
        {
          id: 'ki-2',
          source: 'ai_index:other',
          date: '2026-11-20T10:00:00.000Z',
          content: 'content of ki-2',
          attributes: { service: 'checkout' },
        },
        {
          id: 'legacy-doc',
          source: 'ai_index:plain',
          date: '2026-11-20T09:00:00.000Z',
          content: 'legacy content',
        },
        { id: 'ki-3', source: 'ai_index:plain', content: 'content of ki-3' },
      ]);
      expect(esClient.search).toHaveBeenCalledTimes(1);
    });

    it('omits empty or non-object attributes', async () => {
      givenAiIndices(PLAIN);
      mockSearches([
        hit('ai-index-idx-plain', 'doc-1', ki('ki-1', { attributes: {} })),
        hit('ai-index-idx-plain', 'doc-2', ki('ki-2', { attributes: ['a'] })),
        hit('ai-index-idx-plain', 'doc-3', ki('ki-3')),
      ]);

      const results = await retrieveAiIndices(baseParams);

      expect(results).toHaveLength(3);
      results.forEach((result) => expect(result).not.toHaveProperty('attributes'));
    });

    it('skips hits without content and hits from unknown indices', async () => {
      givenAiIndices(PLAIN);
      mockSearches([
        hit('ai-index-idx-plain', 'doc-1', ki('empty', { content: '' })),
        hit('ai-index-idx-plain', 'doc-2', ki('missing', { content: undefined })),
        hit('ai-index-idx-plain', 'doc-3'),
        hit('unrelated-index', 'doc-4', ki('unrelated')),
        hit('ai-index-idx-plain', 'doc-5', ki('kept')),
      ]);

      const results = await retrieveAiIndices(baseParams);

      expect(results.map(({ id }) => id)).toEqual(['kept']);
    });

    it('returns at most size results', async () => {
      givenAiIndices(PLAIN);
      mockSearches([
        hit('ai-index-idx-plain', 'doc-1', ki('ki-1')),
        hit('ai-index-idx-plain', 'doc-2', ki('ki-2')),
        hit('ai-index-idx-plain', 'doc-3', ki('ki-3')),
      ]);

      const results = await retrieveAiIndices({ ...baseParams, size: 2 });

      expect(results.map(({ id }) => id)).toEqual(['ki-1', 'ki-2']);
    });
  });

  describe('data streams', () => {
    it('resolves backing indices to their exact data stream', async () => {
      givenAiIndices(
        STREAM,
        aiIndex('stream-bar', 'data_stream', 'ai-index-ds-foo-bar'),
        aiIndex('managed', 'data_stream', '.ai-index-ds-managed')
      );
      mockSearches(
        [
          hit('.ds-ai-index-ds-foo-bar-2026.11.20-000001', 'bar-doc', ki('bar')),
          hit(STREAM_BACKING, 'foo-doc', ki('foo')),
          hit('.ds-.ai-index-ds-managed-2026.11.20-000001', 'managed-doc', ki('managed')),
        ],
        [hit('.ds-ai-index-ds-foo-bar-2026.11.20-000001', 'bar-doc', { id: 'bar' })],
        [hit(STREAM_BACKING, 'foo-doc', { id: 'foo' })],
        [hit('.ds-.ai-index-ds-managed-2026.11.20-000001', 'managed-doc', { id: 'managed' })]
      );

      const results = await retrieveAiIndices(baseParams);

      expect(results.map(({ id, source }) => [id, source])).toEqual([
        ['bar', 'ai_index:stream-bar'],
        ['foo', 'ai_index:stream'],
        ['managed', 'ai_index:managed'],
      ]);
    });

    it('does not resolve backing-index names for plain indices', async () => {
      givenAiIndices(aiIndex('plain-foo', 'index', 'ai-index-ds-foo'));
      mockSearches([hit(STREAM_BACKING, 'foo-doc', ki('foo'))]);

      await expect(retrieveAiIndices(baseParams)).resolves.toEqual([]);
    });

    it('verifies the latest revision of every candidate with an unfiltered collapse query', async () => {
      givenAiIndices(STREAM);
      mockSearches(
        [
          hit(STREAM_BACKING, 'ki-1-v1', ki('ki-1')),
          hit(STREAM_BACKING, 'ki-2-v1', ki('ki-2')),
          hit(STREAM_BACKING, 'ki-1-v2', ki('ki-1')),
        ],
        [
          hit(STREAM_BACKING, 'ki-1-v2', { id: 'ki-1' }),
          hit(STREAM_BACKING, 'ki-2-v1', { id: 'ki-2' }),
        ]
      );

      await retrieveAiIndices(baseParams);

      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(esClient.search).toHaveBeenLastCalledWith({
        index: 'ai-index-ds-foo',
        ignore_unavailable: true,
        allow_no_indices: true,
        allow_partial_search_results: false,
        size: 2,
        _source: ['id'],
        query: { bool: { filter: [{ terms: { id: ['ki-1', 'ki-2'] } }] } },
        collapse: { field: 'id' },
        sort: [
          { '@timestamp': { order: 'desc', unmapped_type: 'date' } },
          { updated_at: { order: 'desc', unmapped_type: 'date' } },
          {
            'governance.lifecycle.status': {
              order: 'desc',
              unmapped_type: 'keyword',
              missing: '_last',
            },
          },
        ],
      });
    });

    it('keeps only latest revisions at their own rank', async () => {
      givenAiIndices(STREAM);
      mockSearches(
        [
          hit(STREAM_BACKING, 'revised-v1', ki('revised', { content: 'stale revision' })),
          hit(STREAM_BACKING, 'deleted-v1', ki('deleted')),
          hit(STREAM_BACKING, 'phantom-v1', ki('phantom')),
          hit(STREAM_BACKING, 'kept-v1', ki('kept')),
          hit(STREAM_BACKING, 'revised-v2', ki('revised', { content: 'latest revision' })),
        ],
        [
          hit(STREAM_BACKING, 'revised-v2', { id: 'revised' }),
          hit(STREAM_BACKING, 'deleted-tomb', { id: 'deleted' }),
          hit(STREAM_BACKING, 'phantom-v2', { id: 'phantom' }),
          hit(STREAM_BACKING, 'kept-v1', { id: 'kept' }),
        ]
      );

      const results = await retrieveAiIndices(baseParams);

      expect(results.map(({ id, content }) => [id, content])).toEqual([
        ['kept', 'content of kept'],
        ['revised', 'latest revision'],
      ]);
    });

    it('keeps a legacy document without an id unless a newer revision supersedes it', async () => {
      givenAiIndices(STREAM);
      mockSearches(
        [
          hit(STREAM_BACKING, 'legacy-kept', ki(undefined, { content: 'unsuperseded' })),
          hit(STREAM_BACKING, 'legacy-stale', ki(undefined, { content: 'superseded' })),
        ],
        [hit(STREAM_BACKING, 'legacy-stale-v2', { id: 'legacy-stale' })]
      );

      const results = await retrieveAiIndices(baseParams);

      expect(results.map(({ id, content }) => [id, content])).toEqual([
        ['legacy-kept', 'unsuperseded'],
      ]);
      expect(searchRequest(1).query).toEqual({
        bool: { filter: [{ terms: { id: ['legacy-kept', 'legacy-stale'] } }] },
      });
    });

    it('emits each Knowledge Indicator once and rejects a stale backing index with the same _id', async () => {
      givenAiIndices(STREAM);
      const NEXT_BACKING = '.ds-ai-index-ds-foo-2026.11.21-000002';
      mockSearches(
        [
          hit(STREAM_BACKING, 'ki-1-v1', ki('ki-1', { content: 'stale backing' })),
          hit(NEXT_BACKING, 'ki-1-v1', ki('ki-1', { content: 'latest backing' })),
          hit(NEXT_BACKING, 'ki-1-v1', ki('ki-1', { content: 'duplicate hit' })),
        ],
        [hit(NEXT_BACKING, 'ki-1-v1', { id: 'ki-1' })]
      );

      const results = await retrieveAiIndices(baseParams);

      expect(results.map(({ id, content }) => [id, content])).toEqual([['ki-1', 'latest backing']]);
    });

    it('refills with per-index exclusions and reuses cached latest revisions', async () => {
      givenAiIndices(STREAM);
      const NEXT_BACKING = '.ds-ai-index-ds-foo-2026.11.21-000002';
      mockSearches(
        [
          hit(STREAM_BACKING, 'dead-v1', ki('dead')),
          hit(STREAM_BACKING, 'revised-v1', ki('revised')),
          hit(STREAM_BACKING, 'kept-1', ki('kept-1')),
          hit(STREAM_BACKING, 'stale-v1', ki('stale')),
        ],
        [
          hit(NEXT_BACKING, 'revised-v2', { id: 'revised' }),
          hit(STREAM_BACKING, 'kept-1', { id: 'kept-1' }),
          hit(NEXT_BACKING, 'stale-v2', { id: 'stale' }),
        ],
        [
          hit(NEXT_BACKING, 'revised-v2', ki('revised', { content: 'updated revision' })),
          hit(NEXT_BACKING, 'kept-2', ki('kept-2')),
        ],
        [hit(NEXT_BACKING, 'kept-2', { id: 'kept-2' })]
      );

      const results = await retrieveAiIndices({ ...baseParams, size: 2 });

      expect(results.map(({ id }) => id)).toEqual(['kept-1', 'revised']);
      expect(esClient.search).toHaveBeenCalledTimes(4);
      const { retriever } = searchRequest(2);
      expect(retriever?.rrf?.filter).toEqual({
        bool: {
          filter: [
            buildAiIndexSpaceFilter('default'),
            buildAiIndexUserFilter('jdoe'),
            ACTIVE_FILTER,
            UNEXPIRED_FILTER,
          ],
          must_not: [excludeDocs(STREAM_BACKING, ['dead-v1', 'revised-v1', 'kept-1', 'stale-v1'])],
        },
      });
      expect(searchRequest(3).query).toEqual({
        bool: { filter: [{ terms: { id: ['kept-2'] } }] },
      });
    });

    it('stops after the maximum number of rounds when stale revisions keep filling the window', async () => {
      givenAiIndices(STREAM);
      const staleRound = (prefix: string): Array<readonly MockHit[]> => [
        [
          hit(STREAM_BACKING, `${prefix}-1-v1`, ki(`${prefix}-1`)),
          hit(STREAM_BACKING, `${prefix}-2-v1`, ki(`${prefix}-2`)),
        ],
        [],
      ];
      mockSearches(...staleRound('r1'), ...staleRound('r2'), ...staleRound('r3'));

      await expect(retrieveAiIndices({ ...baseParams, size: 1 })).resolves.toEqual([]);
      expect(esClient.search).toHaveBeenCalledTimes(6);
    });

    it('searches plain indices and data streams together and verifies only stream hits', async () => {
      givenAiIndices(PLAIN, STREAM);
      mockSearches(
        [
          hit('ai-index-idx-plain', 'plain-doc', ki('plain-ki')),
          hit(STREAM_BACKING, 'stream-doc', ki('stream-ki')),
        ],
        [hit(STREAM_BACKING, 'stream-doc', { id: 'stream-ki' })]
      );

      const results = await retrieveAiIndices(baseParams);

      expect(searchedIndices(0)).toEqual(['ai-index-idx-plain', 'ai-index-ds-foo']);
      expect(results.map(({ id, source }) => [id, source])).toEqual([
        ['plain-ki', 'ai_index:plain'],
        ['stream-ki', 'ai_index:stream'],
      ]);
      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(searchRequest(1).query).toEqual({
        bool: { filter: [{ terms: { id: ['stream-ki'] } }] },
      });
    });
  });
});
