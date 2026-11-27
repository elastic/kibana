/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { EsqlQueryRequest, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  MAX_AI_INDEX_QUERY_LENGTH,
  MAX_AI_INDEX_QUERY_LIMIT,
  MAX_MEMORY_USER_ID_LENGTH,
} from '../../common/constants';
import type { AiIndexItem, AiIndexType } from '../../common/http_api/ai_indices';
import { buildAiIndexReadFilter } from '../../common/space_filter';
import { applyLimit } from './apply_limit';
import { AiIndexThrottledError } from './errors';
import { probeAiIndices, type ProbedAiIndex } from './filter_readable_ai_indices';
import { applyKiLifecycle } from './ki_lifecycle';
import { searchAiIndices, type SearchAiIndicesParams } from './search';

jest.mock('./filter_readable_ai_indices');

const probeAiIndicesMock = jest.mocked(probeAiIndices);

type Row = Readonly<Record<string, FieldValue | Record<string, FieldValue> | FieldValue[]>>;

const COLUMNS = ['_index', '_id', 'id', 'updated_at', '@timestamp', 'content', 'attributes'];

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

const backing = (stream: string, generation = 1): string =>
  `.ds-${stream}-2026.11.20-${String(generation).padStart(6, '0')}`;

const row = (index: string, docId: string, overrides: Row = {}): Row => ({
  _index: index,
  _id: docId,
  id: docId,
  updated_at: '2026-11-20T10:00:00.000Z',
  '@timestamp': '2026-11-20T09:00:00.000Z',
  content: `content of ${docId}`,
  ...overrides,
});

const esqlResponse = (rows: readonly Row[]) => {
  const columns = COLUMNS.filter((name) =>
    rows.some((entry) => entry[name] !== undefined && entry[name] !== null)
  );
  return {
    columns: columns.map((name) => ({ name, type: 'keyword' })),
    values: rows.map((entry) => columns.map((name) => entry[name] ?? null)),
  };
};

const hybridQuery = (sources: string, branchLimit: number): string =>
  [
    `FROM ${sources} METADATA _id, _index, _score`,
    '| FORK',
    `    ( WHERE MATCH(content, ?query) | SORT _score DESC | LIMIT ${branchLimit} )`,
    `    ( WHERE MATCH(content.semantic, ?query) | SORT _score DESC | LIMIT ${branchLimit} )`,
    '| FUSE',
    '| SORT _score DESC, _id ASC',
    '| KEEP _index, _id, id, updated_at, @timestamp, content, attributes',
  ].join('\n');

const PLAIN = aiIndex('plain', 'index', 'ai-index-idx-plain');
const OTHER_PLAIN = aiIndex('other', 'index', 'ai-index-idx-other');
const STREAM = aiIndex('stream', 'data_stream', 'ai-index-ds-foo');
const STREAM_BACKING = backing('ai-index-ds-foo');

describe('searchAiIndices', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const aiIndexService = { list: jest.fn() };
  const logger = loggingSystemMock.createLogger();
  const baseParams: SearchAiIndicesParams = {
    esClient,
    aiIndexService,
    logger,
    spaceId: 'default',
    userId: 'jdoe',
    query: 'checkout latency',
    size: 5,
  };

  const esqlRequest = (): EsqlQueryRequest => {
    const request = esClient.esql.query.mock.calls[0]?.[0];
    if (!request) {
      throw new Error('Expected an esClient.esql.query call');
    }
    return request;
  };

  const givenAiIndices = (...aiIndices: AiIndexItem[]): void => {
    aiIndexService.list.mockResolvedValue(aiIndices);
  };

  const givenProbes = (...probes: ProbedAiIndex[]): void => {
    probeAiIndicesMock.mockResolvedValue(probes);
  };

  const mockRows = (...rows: Row[]): void => {
    esClient.esql.query.mockResolvedValue(esqlResponse(rows) as never);
  };

  const resultSources = async (params: Partial<SearchAiIndicesParams> = {}) =>
    (await searchAiIndices({ ...baseParams, ...params })).map(({ id, aiIndexId }) => [
      id,
      aiIndexId,
    ]);

  const forbidden = new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode: 403,
      body: { error: { type: 'security_exception', reason: 'unauthorized' } },
    })
  );

  beforeEach(() => {
    jest.resetAllMocks();
    probeAiIndicesMock.mockImplementation(async ({ aiIndices }) =>
      aiIndices.map((entry) => ({ aiIndex: entry }))
    );
    mockRows();
  });

  describe('early exits', () => {
    it('returns nothing without listing AI indices when aiIndexIds is empty', async () => {
      await expect(searchAiIndices({ ...baseParams, aiIndexIds: [] })).resolves.toEqual([]);
      expect(aiIndexService.list).not.toHaveBeenCalled();
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it.each([0, -1])('returns nothing without listing AI indices when size is %d', async (size) => {
      await expect(searchAiIndices({ ...baseParams, size })).resolves.toEqual([]);
      expect(aiIndexService.list).not.toHaveBeenCalled();
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it.each([
      ['an empty spaceId', { spaceId: '' }, /spaceId/],
      ['a blank spaceId', { spaceId: '   ' }, /spaceId/],
      ['an empty userId', { userId: '' }, /userId/],
      ['a blank userId', { userId: '   ' }, /userId/],
      ['an empty query', { query: '' }, /query/],
      ['a blank query', { query: '   ' }, /query/],
    ])('rejects %s before calling any service', async (_, invalid, pattern) => {
      await expect(searchAiIndices({ ...baseParams, ...invalid })).rejects.toThrow(pattern);
      await expect(searchAiIndices({ ...baseParams, ...invalid, size: 0 })).rejects.toThrow(
        pattern
      );
      expect(aiIndexService.list).not.toHaveBeenCalled();
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it.each([
      ['fractional', 1.5],
      ['negative fractional', -1.5],
      ['above max', MAX_AI_INDEX_QUERY_LIMIT + 1],
      ['NaN', Number.NaN],
      ['infinite', Number.POSITIVE_INFINITY],
    ])('rejects a %s size before calling any service', async (_, size) => {
      await expect(searchAiIndices({ ...baseParams, size })).rejects.toThrow(/size/);
      await expect(searchAiIndices({ ...baseParams, size, aiIndexIds: [] })).rejects.toThrow(
        /size/
      );
      expect(aiIndexService.list).not.toHaveBeenCalled();
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });
  });

  describe('target selection', () => {
    it('searches every AI index of the space when aiIndexIds is omitted', async () => {
      givenAiIndices(PLAIN, OTHER_PLAIN);

      await searchAiIndices(baseParams);

      expect(aiIndexService.list).toHaveBeenCalledWith('default');
      expect(esqlRequest().query).toMatch(
        /^FROM "ai-index-idx-plain", "ai-index-idx-other" METADATA/
      );
    });

    it('searches only the requested AI indices and ignores unknown ids', async () => {
      givenAiIndices(PLAIN, OTHER_PLAIN);

      await searchAiIndices({ ...baseParams, aiIndexIds: ['other', 'unknown'] });

      expect(probeAiIndicesMock).toHaveBeenCalledWith({
        esClient,
        aiIndices: [OTHER_PLAIN],
        logger,
      });
      expect(esqlRequest().query).toMatch(/^FROM "ai-index-idx-other" METADATA/);
    });

    it('returns nothing without probing when only unknown ids are requested', async () => {
      givenAiIndices(PLAIN);

      await expect(searchAiIndices({ ...baseParams, aiIndexIds: ['unknown'] })).resolves.toEqual(
        []
      );
      expect(probeAiIndicesMock).not.toHaveBeenCalled();
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('skips AI indices whose backing index is missing or whose probe failed', async () => {
      givenAiIndices(PLAIN, OTHER_PLAIN, STREAM);
      givenProbes(
        { aiIndex: PLAIN, missing: true },
        { aiIndex: OTHER_PLAIN },
        { aiIndex: STREAM, failure: { reason: 'unauthorized', privilege: true } }
      );

      await searchAiIndices(baseParams);

      expect(esqlRequest().query).toMatch(/^FROM "ai-index-idx-other" METADATA/);
    });

    it('returns nothing without querying when every AI index is missing or unreadable', async () => {
      givenAiIndices(PLAIN, OTHER_PLAIN);
      givenProbes(
        { aiIndex: PLAIN, missing: true },
        { aiIndex: OTHER_PLAIN, failure: { reason: 'timed out', privilege: false } }
      );

      await expect(searchAiIndices(baseParams)).resolves.toEqual([]);
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('returns nothing when the whole readability probe is refused with a 403', async () => {
      givenAiIndices(PLAIN);
      probeAiIndicesMock.mockRejectedValue(forbidden);

      await expect(searchAiIndices(baseParams)).resolves.toEqual([]);
      expect(logger.debug).toHaveBeenCalled();
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('propagates readability probe failures other than a 403', async () => {
      givenAiIndices(PLAIN);
      const unavailable = new errors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 503,
          body: { error: { type: 'unavailable', reason: 'cluster unavailable' } },
        })
      );
      probeAiIndicesMock.mockRejectedValue(unavailable);

      await expect(searchAiIndices(baseParams)).rejects.toBe(unavailable);
    });

    it('searches a shared backing target once and maps rows to the first AI index', async () => {
      givenAiIndices(PLAIN, aiIndex('alias', 'index', 'ai-index-idx-plain'));
      mockRows(row('ai-index-idx-plain', 'ki-1'));

      await expect(resultSources()).resolves.toEqual([['ki-1', 'plain']]);
      expect(esqlRequest().query).toMatch(/^FROM "ai-index-idx-plain" METADATA/);
    });

    it('skips legacy index-pattern destinations before probing', async () => {
      givenAiIndices(
        PLAIN,
        aiIndex('wildcard', 'index', 'ai-index-idx-logs-*'),
        aiIndex('multi', 'index', 'ai-index-idx-a,ai-index-idx-b')
      );

      await searchAiIndices(baseParams);

      expect(probeAiIndicesMock).toHaveBeenCalledWith({
        esClient,
        aiIndices: [PLAIN],
        logger,
      });
      expect(esqlRequest().query).toMatch(/^FROM "ai-index-idx-plain" METADATA/);
    });

    it('returns nothing without probing when only legacy pattern destinations exist', async () => {
      givenAiIndices(aiIndex('wildcard', 'index', 'ai-index-idx-logs-*'));

      await expect(searchAiIndices(baseParams)).resolves.toEqual([]);
      expect(probeAiIndicesMock).not.toHaveBeenCalled();
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('throws AiIndexThrottledError when any readability probe returns 429', async () => {
      givenAiIndices(PLAIN, OTHER_PLAIN);
      givenProbes(
        { aiIndex: PLAIN },
        {
          aiIndex: OTHER_PLAIN,
          failure: { reason: 'too many requests', privilege: false, throttled: true },
        }
      );

      await expect(searchAiIndices(baseParams)).rejects.toEqual(
        new AiIndexThrottledError('too many requests')
      );
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });
  });

  describe('query errors', () => {
    it('returns nothing when ES|QL reports an unknown index', async () => {
      givenAiIndices(PLAIN);
      esClient.esql.query.mockRejectedValue(
        new errors.ResponseError(
          elasticsearchClientMock.createApiResponse({
            statusCode: 400,
            body: {
              error: {
                type: 'verification_exception',
                reason: 'Unknown index [ai-index-idx-plain]',
              },
            },
          })
        )
      );

      await expect(searchAiIndices(baseParams)).resolves.toEqual([]);
    });

    it('propagates other query failures', async () => {
      givenAiIndices(PLAIN);
      esClient.esql.query.mockRejectedValue(forbidden);

      await expect(searchAiIndices(baseParams)).rejects.toBe(forbidden);
    });
  });

  describe('hybrid query', () => {
    it.each([
      ['plain indices', [PLAIN, OTHER_PLAIN], '"ai-index-idx-plain", "ai-index-idx-other"'],
      [
        'data streams',
        [STREAM, aiIndex('managed', 'data_stream', '.ai-index-ds-managed')],
        '"ai-index-ds-foo", ".ai-index-ds-managed"',
      ],
      [
        'plain indices and data streams',
        [PLAIN, STREAM],
        '"ai-index-idx-plain", "ai-index-ds-foo"',
      ],
    ])('runs one scoped ES|QL hybrid query over %s', async (_, aiIndices, sources) => {
      givenAiIndices(...aiIndices);

      await searchAiIndices({ ...baseParams, size: 3 });

      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
      expect(esClient.esql.query).toHaveBeenCalledWith(
        {
          query: applyLimit(
            applyKiLifecycle(
              hybridQuery(sources, 3),
              aiIndices.map(({ dest }) => dest)
            ),
            3
          ),
          filter: buildAiIndexReadFilter({ spaceId: 'default', userId: 'jdoe' }),
          drop_null_columns: true,
          allow_partial_results: true,
          params: [{ query: 'checkout latency' }],
        },
        expect.any(Object)
      );
    });

    it('applies lifecycle filters, branch limits, and the row limit to plain indices', async () => {
      givenAiIndices(PLAIN);

      await searchAiIndices({ ...baseParams, size: 3 });

      const { query } = esqlRequest();
      expect(query).toContain('governance.lifecycle.status IS NULL');
      expect(query).toContain('expires_at IS NULL');
      expect(query).not.toContain('INLINE STATS');
      expect(query.match(/LIMIT 3/g)).toHaveLength(3);
      expect(query).toContain('FUSE');
      expect(query).toMatch(/KEEP _index, _id, id, updated_at, @timestamp, content, attributes/);
      expect(query).toMatch(/LIMIT 3$/);
    });

    it('collapses data streams to their latest revision before forking', async () => {
      givenAiIndices(PLAIN, aiIndex('managed', 'data_stream', '.ai-index-ds-managed'));

      await searchAiIndices(baseParams);

      const { query } = esqlRequest();
      expect(query).toContain('_index LIKE ".ds-.ai-index-ds-managed-????.??.??-*"');
      expect(query.indexOf('INLINE STATS')).toBeGreaterThan(-1);
      expect(query.indexOf('INLINE STATS')).toBeLessThan(query.indexOf('FORK'));
      expect(query.indexOf('governance.lifecycle.status')).toBeLessThan(query.indexOf('FORK'));
    });

    it('accepts a userId up to MAX_MEMORY_USER_ID_LENGTH', async () => {
      givenAiIndices(PLAIN);
      const longUserId = 'u'.repeat(MAX_MEMORY_USER_ID_LENGTH);

      await searchAiIndices({ ...baseParams, userId: longUserId });

      expect(esqlRequest().filter).toEqual(
        buildAiIndexReadFilter({ spaceId: 'default', userId: longUserId })
      );
    });

    it('runs when the generated FROM clause exceeds MAX_AI_INDEX_QUERY_LENGTH', async () => {
      const manyIndices = Array.from({ length: 45 }, (_, idx) =>
        aiIndex(
          `idx-${idx}`,
          'index',
          `ai-index-idx-${String(idx).padStart(2, '0')}-${'a'.repeat(225)}`
        )
      );
      givenAiIndices(...manyIndices);

      await searchAiIndices(baseParams);

      expect(esqlRequest().query.length).toBeGreaterThan(MAX_AI_INDEX_QUERY_LENGTH);
      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('row mapping', () => {
    it('maps rows to results in rank order across plain indices and data streams', async () => {
      givenAiIndices(PLAIN, OTHER_PLAIN, STREAM);
      mockRows(
        row('ai-index-idx-other', 'ki-2', { attributes: { service: 'checkout' } }),
        row(STREAM_BACKING, 'stream-doc', { id: 'stream-ki' }),
        row('ai-index-idx-plain', 'legacy-doc', {
          id: null,
          updated_at: null,
          content: 'legacy content',
        }),
        row('ai-index-idx-plain', 'empty-id-doc', {
          id: '',
          updated_at: '',
          content: 'fallback on empty strings',
        }),
        row('ai-index-idx-plain', 'ki-3', { updated_at: null, '@timestamp': null })
      );

      await expect(searchAiIndices(baseParams)).resolves.toEqual([
        {
          id: 'ki-2',
          aiIndexId: 'other',
          date: '2026-11-20T10:00:00.000Z',
          content: 'content of ki-2',
          attributes: { service: 'checkout' },
        },
        {
          id: 'stream-ki',
          aiIndexId: 'stream',
          date: '2026-11-20T10:00:00.000Z',
          content: 'content of stream-doc',
        },
        {
          id: 'legacy-doc',
          aiIndexId: 'plain',
          date: '2026-11-20T09:00:00.000Z',
          content: 'legacy content',
        },
        {
          id: 'empty-id-doc',
          aiIndexId: 'plain',
          date: '2026-11-20T09:00:00.000Z',
          content: 'fallback on empty strings',
        },
        { id: 'ki-3', aiIndexId: 'plain', content: 'content of ki-3' },
      ]);
    });

    it('maps rows when ES|QL drops columns that are null in every row', async () => {
      givenAiIndices(PLAIN);
      mockRows({ _index: 'ai-index-idx-plain', _id: 'doc-1', content: 'bare content' });

      await expect(searchAiIndices(baseParams)).resolves.toEqual([
        { id: 'doc-1', aiIndexId: 'plain', content: 'bare content' },
      ]);
    });

    it('resolves backing indices to their exact data stream', async () => {
      givenAiIndices(
        STREAM,
        aiIndex('stream-bar', 'data_stream', 'ai-index-ds-foo-bar'),
        aiIndex('managed', 'data_stream', '.ai-index-ds-managed')
      );
      mockRows(
        row(backing('ai-index-ds-foo-bar'), 'bar'),
        row(STREAM_BACKING, 'foo'),
        row(backing('.ai-index-ds-managed', 2), 'managed'),
        row(backing('unrelated'), 'unrelated')
      );

      await expect(resultSources()).resolves.toEqual([
        ['bar', 'stream-bar'],
        ['foo', 'stream'],
        ['managed', 'managed'],
      ]);
    });

    it('does not resolve backing-index names for plain indices', async () => {
      givenAiIndices(aiIndex('plain-foo', 'index', 'ai-index-ds-foo'));
      mockRows(row(STREAM_BACKING, 'foo'));

      await expect(searchAiIndices(baseParams)).resolves.toEqual([]);
    });

    it('omits empty or non-object attributes', async () => {
      givenAiIndices(PLAIN);
      mockRows(
        row('ai-index-idx-plain', 'ki-1', { attributes: {} }),
        row('ai-index-idx-plain', 'ki-2', { attributes: ['a'] }),
        row('ai-index-idx-plain', 'ki-3', { attributes: 'flat' }),
        row('ai-index-idx-plain', 'ki-4', { attributes: null }),
        row('ai-index-idx-plain', 'ki-5')
      );

      const results = await searchAiIndices(baseParams);

      expect(results).toHaveLength(5);
      results.forEach((result) => expect(result).not.toHaveProperty('attributes'));
    });

    it('skips rows without content, without an id, or from unknown indices', async () => {
      givenAiIndices(PLAIN);
      mockRows(
        row('ai-index-idx-plain', 'empty', { content: '' }),
        row('ai-index-idx-plain', 'missing', { content: null }),
        row('ai-index-idx-plain', 'numeric', { content: 42 }),
        row('ai-index-idx-plain', '', { id: null }),
        row('unrelated-index', 'unrelated'),
        row('ai-index-idx-plain', 'kept')
      );

      const results = await searchAiIndices(baseParams);

      expect(results.map(({ id }) => id)).toEqual(['kept']);
    });
  });
});
