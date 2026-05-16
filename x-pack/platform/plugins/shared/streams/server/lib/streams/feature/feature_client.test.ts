/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('timers/promises', () => ({
  setTimeout: jest.fn().mockResolvedValue(undefined),
}));

import type { Feature } from '@kbn/streams-schema';
import type { MappingsDefinition } from '@kbn/es-mappings';
import type { IDataStreamClient } from '@kbn/data-streams';
import { FeatureClient, buildSearchEmbeddingText } from './feature_client';
import { FEATURES_DATA_STREAM, type StoredFeatureDoc } from './data_stream';
import { STREAM_NAME, FEATURE_ID, FEATURE_SEARCH_EMBEDDING, FEATURE_DELETED } from './fields';

// ==================== Helpers ====================

const createMockLogger = () => loggerMock.create();

const createMockDataStreamClient = () =>
  ({
    create: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    search: jest.fn().mockResolvedValue({ hits: { hits: [], total: { value: 0 } } }),
    exists: jest.fn().mockResolvedValue(true),
    helpers: { getFieldsFromHit: jest.fn() },
  } as unknown as IDataStreamClient<MappingsDefinition, StoredFeatureDoc>);

const createMockEsClient = () => ({
  esql: {
    query: jest.fn().mockResolvedValue({ columns: [], values: [] }),
  },
  search: jest.fn().mockResolvedValue({
    hits: { hits: [], total: { value: 0 } },
  }),
});

const createFeatureClient = ({
  dataStreamClient = createMockDataStreamClient(),
  esClient = createMockEsClient(),
  logger = createMockLogger(),
  config,
}: {
  dataStreamClient?: ReturnType<typeof createMockDataStreamClient>;
  esClient?: ReturnType<typeof createMockEsClient>;
  logger?: ReturnType<typeof createMockLogger>;
  config?: {
    feature_ttl_days: number;
    semantic_min_score: number;
    rrf_rank_constant: number;
  };
} = {}) => {
  const client = new FeatureClient(
    {
      dataStreamClient,
      esClient: esClient as unknown as ElasticsearchClient,
      logger: logger as unknown as Logger,
    },
    config
  );
  return { client, dataStreamClient, esClient, logger };
};

const createFeature = (overrides: Partial<Feature> = {}): Feature => ({
  id: 'feat-1',
  stream_name: 'logs.test',
  type: 'service',
  subtype: 'http',
  title: 'HTTP service',
  description: 'Detected HTTP traffic',
  properties: { protocol: 'http' },
  confidence: 80,
  evidence: ['evidence-1'],
  evidence_doc_ids: ['doc-1'],
  tags: ['tag-a'],
  ...overrides,
});

// Simulate the ES|QL _source response for findLatest
const makeEsqlSourceResponse = (sources: StoredFeatureDoc[]) => ({
  columns: [{ name: '_source', type: 'keyword' }],
  values: sources.map((s) => [s]),
});

// ==================== Tests ====================

describe('buildSearchEmbeddingText', () => {
  it('builds structured text with stream, title and description', () => {
    const text = buildSearchEmbeddingText(createFeature(), 'logs.test');
    expect(text).toBe(
      'Stream: logs.test\nTitle: HTTP service\nDescription: Detected HTTP traffic\nType: service\nSubtype: http\nTags: tag-a'
    );
  });

  it('omits the stream when not provided', () => {
    const text = buildSearchEmbeddingText(createFeature());
    expect(text).toBe(
      'Title: HTTP service\nDescription: Detected HTTP traffic\nType: service\nSubtype: http\nTags: tag-a'
    );
  });

  it('omits empty/missing optional fields', () => {
    const text = buildSearchEmbeddingText(
      createFeature({ subtype: undefined, tags: [], title: undefined }),
      'logs.test'
    );
    expect(text).toBe('Stream: logs.test\nDescription: Detected HTTP traffic\nType: service');
  });
});

describe('FeatureClient', () => {
  describe('getExcludedFeatures()', () => {
    it('always returns empty (exclusions store not yet implemented)', async () => {
      const { client } = createFeatureClient();
      const result = await client.getExcludedFeatures('logs.test');
      expect(result).toEqual({ hits: [], total: 0 });
    });
  });

  describe('getFeatures()', () => {
    it('returns empty result without hitting ES when stream list is empty', async () => {
      const { client, esClient } = createFeatureClient();
      const result = await client.getFeatures([]);
      expect(result).toEqual({ hits: [], total: 0 });
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('maps ES|QL _source back to Feature shape', async () => {
      const esClient = createMockEsClient();
      const storedFeature: StoredFeatureDoc = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        'feature.id': 'feat-1',
        [STREAM_NAME]: 'logs.test',
        'feature.type': 'service',
        'feature.subtype': 'http',
        'feature.title': 'HTTP service',
        'feature.description': 'Detected HTTP traffic',
        'feature.properties': { protocol: 'http' },
        'feature.confidence': 80,
        'feature.evidence': ['evidence-1'],
        'feature.evidence_doc_ids': ['doc-1'],
        'feature.tags': ['tag-a'],
      };
      esClient.esql.query.mockResolvedValue(makeEsqlSourceResponse([storedFeature]));
      const { client } = createFeatureClient({ esClient });

      const result = await client.getFeatures('logs.test');

      expect(result.total).toBe(1);
      expect(result.hits[0]).toMatchObject({
        id: 'feat-1',
        stream_name: 'logs.test',
        type: 'service',
        confidence: 80,
        excluded_at: undefined,
      });
    });

    it('does not include deleted features', async () => {
      const esClient = createMockEsClient();
      // ES|QL query should filter deleted; client returns what ES|QL returns
      esClient.esql.query.mockResolvedValue(makeEsqlSourceResponse([]));
      const { client } = createFeatureClient({ esClient });

      const result = await client.getFeatures('logs.test');
      expect(result.hits).toHaveLength(0);
    });

    it('applies the tombstone filter AFTER the latest-per-group reduction', async () => {
      // The tombstone exclusion MUST run post-grouping. Applying it pre-grouping
      // (i.e. before the INLINE STATS reductions) would drop tombstones from the
      // candidate set and let an older non-deleted revision be re-elected as the
      // "current" state of an already-deleted feature.
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
      const { client } = createFeatureClient({ esClient });

      await client.getFeatures('logs.test');

      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
      const queryStr = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;

      expect(queryStr).toMatch(/feature\.deleted.*IS NULL.*feature\.deleted.*==\s*false/is);

      const lastInlineStatsIdx = queryStr.lastIndexOf('INLINE STATS');
      const firstFeatureDeletedIdx = queryStr.indexOf('feature.deleted');
      expect(lastInlineStatsIdx).toBeGreaterThan(-1);
      expect(firstFeatureDeletedIdx).toBeGreaterThan(lastInlineStatsIdx);
    });

    it('applies the freshness filter AFTER the latest-per-group reduction by default', async () => {
      // Replaces the pre-refactor `expires_at >= now` read filter. Computed
      // dynamically against `@timestamp` of the latest surviving revision so
      // that re-emitting a feature slides it back inside the TTL window and
      // features the LLM stops producing age out without a stored expiry.
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
      const { client } = createFeatureClient({ esClient });

      await client.getFeatures('logs.test');

      const queryStr = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;

      expect(queryStr).toMatch(/@timestamp\s*>=\s*TO_DATETIME\(/);

      const lastInlineStatsIdx = queryStr.lastIndexOf('INLINE STATS');
      const freshnessIdx = queryStr.search(/@timestamp\s*>=\s*TO_DATETIME\(/);
      expect(freshnessIdx).toBeGreaterThan(lastInlineStatsIdx);
    });

    it('omits the freshness filter when includeExpired is true', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
      const { client } = createFeatureClient({ esClient });

      await client.getFeatures('logs.test', { includeExpired: true });

      const queryStr = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
      expect(queryStr).not.toMatch(/@timestamp\s*>=\s*TO_DATETIME\(/);
      // Tombstone filter must still be present.
      expect(queryStr).toMatch(/feature\.deleted.*IS NULL.*feature\.deleted.*==\s*false/is);
    });

    it('computes the freshness cutoff from the configured feature_ttl_days', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
      const { client } = createFeatureClient({
        esClient,
        config: { feature_ttl_days: 7, semantic_min_score: 0.5, rrf_rank_constant: 60 },
      });

      const before = Date.now();
      await client.getFeatures('logs.test');
      const after = Date.now();

      const queryStr = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
      const match = queryStr.match(/TO_DATETIME\("([^"]+)"\)/);
      expect(match).not.toBeNull();
      const cutoffMs = Date.parse(match![1]);

      const ttlMs = 7 * 24 * 60 * 60 * 1000;
      // Allow for the cutoff being computed anywhere between `before - ttl` and
      // `after - ttl` — both bounds inclusive.
      expect(cutoffMs).toBeGreaterThanOrEqual(before - ttlMs);
      expect(cutoffMs).toBeLessThanOrEqual(after - ttlMs);
    });
  });

  describe('getFeature()', () => {
    it('bypasses the freshness filter (direct id lookup)', async () => {
      // Matches the pre-refactor `storageClient.get({ id })` behavior: a direct
      // lookup by id should return the feature regardless of expiry.
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(
        makeEsqlSourceResponse([
          { 'feature.id': 'feat-1', 'stream.name': 'logs.test' } as StoredFeatureDoc,
        ])
      );
      const { client } = createFeatureClient({ esClient });

      await client.getFeature('logs.test', 'feat-1');

      const queryStr = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
      expect(queryStr).not.toMatch(/@timestamp\s*>=\s*TO_DATETIME\(/);
    });
  });

  describe('bulk() — index', () => {
    it('throws StatusError 400 when an indexed feature has an incomplete filter', async () => {
      const { client } = createFeatureClient();

      await expect(
        client.bulk('logs.test', [
          {
            index: {
              feature: createFeature({
                filter: { field: 'host.name', operator: 'eq' } as unknown as Feature['filter'],
              }),
            },
          },
        ])
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('filter is incomplete'),
      });
    });

    it('appends a revision document via dataStreamClient.create on index op', async () => {
      const { client, dataStreamClient } = createFeatureClient();

      await client.bulk('logs.test', [{ index: { feature: createFeature() } }]);

      expect(dataStreamClient.create).toHaveBeenCalledTimes(1);
      const call = (dataStreamClient.create as jest.Mock).mock.calls[0][0];
      expect(call.space).toBeUndefined();
      expect(call.documents).toHaveLength(1);
      const doc = call.documents[0];
      expect(doc[FEATURE_ID]).toBe('feat-1');
      expect(doc[STREAM_NAME]).toBe('logs.test');
      expect(doc['@timestamp']).toEqual(expect.any(String));
    });

    it('includes the embedding field on the first attempt', async () => {
      const { client, dataStreamClient } = createFeatureClient();

      await client.bulk('logs.test', [{ index: { feature: createFeature() } }]);

      const doc = (dataStreamClient.create as jest.Mock).mock.calls[0][0].documents[0];
      expect(doc[FEATURE_SEARCH_EMBEDDING]).toEqual(expect.any(String));
    });

    it('returns applied count equal to number of documents written', async () => {
      const { client } = createFeatureClient();

      const result = await client.bulk('logs.test', [
        { index: { feature: createFeature({ id: 'feat-a' }) } },
        { index: { feature: createFeature({ id: 'feat-b' }) } },
      ]);

      expect(result.applied).toBe(2);
      expect(result.skipped).toBe(0);
    });
  });

  describe('bulk() — delete', () => {
    it('appends a tombstone document (deleted=true) on delete op', async () => {
      const { client, dataStreamClient } = createFeatureClient();

      await client.bulk('logs.test', [{ delete: { id: 'feat-1' } }]);

      const call = (dataStreamClient.create as jest.Mock).mock.calls[0][0];
      expect(call.documents).toHaveLength(1);
      const doc = call.documents[0];
      expect(doc[FEATURE_DELETED]).toBe(true);
      expect(doc[FEATURE_ID]).toBe('feat-1');
      expect(doc[STREAM_NAME]).toBe('logs.test');
    });
  });

  describe('bulk() — exclude / restore (noops)', () => {
    it('counts exclude ops as skipped without calling dataStreamClient', async () => {
      const { client, dataStreamClient } = createFeatureClient();

      const result = await client.bulk('logs.test', [{ exclude: { id: 'uuid-1' } }]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(dataStreamClient.create).not.toHaveBeenCalled();
    });

    it('counts restore ops as skipped without calling dataStreamClient', async () => {
      const { client, dataStreamClient } = createFeatureClient();

      const result = await client.bulk('logs.test', [{ restore: { id: 'uuid-1' } }]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(dataStreamClient.create).not.toHaveBeenCalled();
    });

    it('logs a debug message for excluded/restored ops', async () => {
      const { client, logger } = createFeatureClient();

      await client.bulk('logs.test', [{ exclude: { id: 'uuid-1' } }]);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Exclusion store not implemented')
      );
    });

    it('mixes applied (index/delete) and skipped (exclude/restore) in one call', async () => {
      const { client } = createFeatureClient();

      const result = await client.bulk('logs.test', [
        { index: { feature: createFeature() } },
        { delete: { id: 'uuid-2' } },
        { exclude: { id: 'uuid-3' } },
        { restore: { id: 'uuid-4' } },
      ]);

      expect(result.applied).toBe(2); // index + delete each produce a document
      expect(result.skipped).toBe(2); // exclude + restore
    });
  });

  describe('bulk() — inference fallback', () => {
    it('retries with embedding after inference error then falls back without embedding', async () => {
      const dataStreamClient = createMockDataStreamClient();
      const logger = createMockLogger();

      const inferenceErrorResponse = {
        errors: true,
        items: [
          {
            create: {
              _index: FEATURES_DATA_STREAM,
              _id: 'doc-1',
              status: 500,
              error: {
                type: 'exception',
                reason:
                  'Exception when running inference id [elser-endpoint] on field [feature.search_embedding]',
                caused_by: {
                  type: 'status_exception',
                  reason: 'Unable to find model deployment task [elser-endpoint]',
                },
              },
            },
          },
        ],
      };

      (dataStreamClient.create as jest.Mock)
        .mockResolvedValueOnce(inferenceErrorResponse)
        .mockResolvedValueOnce(inferenceErrorResponse)
        .mockResolvedValueOnce(inferenceErrorResponse)
        .mockResolvedValueOnce({ errors: false, items: [] });

      const { client } = createFeatureClient({ dataStreamClient, logger });

      await client.bulk('logs.test', [{ index: { feature: createFeature() } }]);

      // 3 attempts with embedding + 1 fallback without
      expect(dataStreamClient.create).toHaveBeenCalledTimes(4);

      const withEmbedding = (dataStreamClient.create as jest.Mock).mock.calls[0][0].documents[0];
      expect(withEmbedding[FEATURE_SEARCH_EMBEDDING]).toEqual(expect.any(String));

      const withoutEmbedding = (dataStreamClient.create as jest.Mock).mock.calls[3][0].documents[0];
      expect(FEATURE_SEARCH_EMBEDDING in withoutEmbedding).toBe(false);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('falling back to writing without semantic_text embedding')
      );
    });

    it('does not retry when create succeeds on the first attempt', async () => {
      const { client, dataStreamClient } = createFeatureClient();

      await client.bulk('logs.test', [{ index: { feature: createFeature() } }]);

      expect(dataStreamClient.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteFeatures()', () => {
    it('fetches latest features via ES|QL then appends tombstones', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(
        makeEsqlSourceResponse([
          { 'feature.id': 'feat-a', 'stream.name': 'logs.test' } as StoredFeatureDoc,
          { 'feature.id': 'feat-b', 'stream.name': 'logs.test' } as StoredFeatureDoc,
        ])
      );

      const { client, dataStreamClient } = createFeatureClient({ esClient });

      await client.deleteFeatures('logs.test');

      expect(dataStreamClient.create).toHaveBeenCalledTimes(1);
      const docs = (dataStreamClient.create as jest.Mock).mock.calls[0][0].documents;
      expect(docs).toHaveLength(2);
      for (const doc of docs) {
        expect(doc[FEATURE_DELETED]).toBe(true);
        expect(doc[STREAM_NAME]).toBe('logs.test');
      }
      expect(docs.map((d: StoredFeatureDoc) => d[FEATURE_ID])).toEqual(
        expect.arrayContaining(['feat-a', 'feat-b'])
      );
    });

    it('does nothing when no features exist for the stream', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({ columns: [], values: [] });

      const { client, dataStreamClient } = createFeatureClient({ esClient });

      await client.deleteFeatures('logs.test');

      expect(dataStreamClient.create).not.toHaveBeenCalled();
    });

    it('bypasses the freshness filter so expired features are also tombstoned', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
      const { client } = createFeatureClient({ esClient });

      await client.deleteFeatures('logs.test');

      const queryStr = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
      expect(queryStr).not.toMatch(/@timestamp\s*>=\s*TO_DATETIME\(/);
    });
  });

  describe('getLatestRevisionTimestamp()', () => {
    it('returns null when no features exist', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(makeEsqlSourceResponse([]));
      const { client } = createFeatureClient({ esClient });

      const result = await client.getLatestRevisionTimestamp('logs.test');
      expect(result).toBeNull();
    });

    it('returns the @timestamp of the latest revision', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(
        makeEsqlSourceResponse([{ '@timestamp': '2024-06-01T00:00:00.000Z' } as StoredFeatureDoc])
      );
      const { client } = createFeatureClient({ esClient });

      const result = await client.getLatestRevisionTimestamp('logs.test', {
        type: ['entity', 'schema'],
      });
      expect(result).toEqual({ '@timestamp': '2024-06-01T00:00:00.000Z' });
    });

    it('bypasses the freshness filter so the caller can see stale streams', async () => {
      // shouldIdentifyFeatures uses this to decide whether re-identification is
      // due; a stream whose latest revision aged past the TTL must still report
      // its timestamp, not appear empty.
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
      const { client } = createFeatureClient({ esClient });

      await client.getLatestRevisionTimestamp('logs.test');

      const queryStr = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
      expect(queryStr).not.toMatch(/@timestamp\s*>=\s*TO_DATETIME\(/);
    });
  });

  describe('findFeatures() — query shape per mode', () => {
    it('returns empty without hitting storage when stream list is empty', async () => {
      const { client, esClient } = createFeatureClient();
      const result = await client.findFeatures([], 'http');
      expect(result).toEqual({ hits: [], total: 0 });
      expect(esClient.esql.query).not.toHaveBeenCalled();
    });

    it('short-circuits when phase-1 returns no ids', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
      const { client } = createFeatureClient({ esClient });

      const result = await client.findFeatures('logs.test', 'http');
      expect(result).toEqual({ hits: [], total: 0 });
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('keyword mode issues a top-level keyword query (no retriever)', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['id-1']],
      });
      esClient.search.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } });
      const { client } = createFeatureClient({ esClient });

      await client.findFeatures('logs.test', 'http', { searchMode: 'keyword' });

      expect(esClient.search).toHaveBeenCalledTimes(1);
      const args = esClient.search.mock.calls[0][0];
      expect(args.query).toBeDefined();
      expect(args.retriever).toBeUndefined();
    });

    it('semantic mode issues a linear retriever with embedding field', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['id-1']],
      });
      esClient.search.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } });
      const { client } = createFeatureClient({ esClient });

      await client.findFeatures('logs.test', 'http', { searchMode: 'semantic' });

      const args = esClient.search.mock.calls[0][0];
      expect(args.retriever?.linear).toBeDefined();
      expect(JSON.stringify(args.retriever)).toContain(FEATURE_SEARCH_EMBEDDING);
    });

    it('hybrid mode issues an RRF retriever combining keyword and semantic legs', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['id-1']],
      });
      esClient.search.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } });
      const { client } = createFeatureClient({ esClient });

      await client.findFeatures('logs.test', 'http', { searchMode: 'hybrid' });

      const args = esClient.search.mock.calls[0][0];
      expect(args.retriever?.rrf?.retrievers).toHaveLength(2);
    });

    it('defaults to hybrid when no searchMode is provided', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['id-1']],
      });
      esClient.search.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } });
      const { client } = createFeatureClient({ esClient });

      await client.findFeatures('logs.test', 'http');

      const args = esClient.search.mock.calls[0][0];
      expect(args.retriever?.rrf?.retrievers).toHaveLength(2);
    });

    it('propagates the error when an explicit search mode fails', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['id-1']],
      });
      esClient.search.mockRejectedValue(new Error('boom'));
      const { client } = createFeatureClient({ esClient });

      await expect(
        client.findFeatures('logs.test', 'http', { searchMode: 'semantic' })
      ).rejects.toThrow('boom');
    });

    it('falls back to keyword search when an auto-resolved non-keyword mode throws', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();
      esClient.esql.query.mockResolvedValue({
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['id-1']],
      });
      esClient.search
        .mockRejectedValueOnce(new Error('retriever parse error'))
        .mockResolvedValueOnce({ hits: { hits: [], total: { value: 0 } } });
      const { client } = createFeatureClient({ esClient, logger });

      await client.findFeatures('logs.test', 'http');

      // Phase 1 ES|QL once, then search fails once (hybrid), then search succeeds (keyword)
      expect(esClient.search).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('falling back to keyword'));
    });

    it('scopes phase-2 search to the latest-revision ids from phase 1', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['id-1'], ['id-2']],
      });
      esClient.search.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } });
      const { client } = createFeatureClient({ esClient });

      await client.findFeatures('logs.test', 'http', { searchMode: 'keyword' });

      const args = esClient.search.mock.calls[0][0];
      const idsFilter = args.query?.bool?.filter?.find(
        (f: { ids?: { values: string[] } }) => f.ids !== undefined
      );
      expect(idsFilter?.ids?.values).toEqual(expect.arrayContaining(['id-1', 'id-2']));
    });

    it('phase-1 ES|QL excludes tombstoned groups AFTER the latest-per-group reduction', async () => {
      // Same invariant as getFeatures: the post-grouping filter is what guarantees
      // that a (feature.id, stream.name) whose latest event is a tombstone never
      // contributes an _id to phase 2.
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['id-1']],
      });
      esClient.search.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } });
      const { client } = createFeatureClient({ esClient });

      await client.findFeatures('logs.test', 'http', { searchMode: 'keyword' });

      expect(esClient.esql.query).toHaveBeenCalledTimes(1);
      const queryStr = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;

      expect(queryStr).toMatch(/feature\.deleted.*IS NULL.*feature\.deleted.*==\s*false/is);

      const lastInlineStatsIdx = queryStr.lastIndexOf('INLINE STATS');
      const firstFeatureDeletedIdx = queryStr.indexOf('feature.deleted');
      expect(lastInlineStatsIdx).toBeGreaterThan(-1);
      expect(firstFeatureDeletedIdx).toBeGreaterThan(lastInlineStatsIdx);
    });

    it('phase-1 ES|QL excludes expired groups by default', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['id-1']],
      });
      esClient.search.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } });
      const { client } = createFeatureClient({ esClient });

      await client.findFeatures('logs.test', 'http', { searchMode: 'keyword' });

      const queryStr = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
      expect(queryStr).toMatch(/@timestamp\s*>=\s*TO_DATETIME\(/);

      const lastInlineStatsIdx = queryStr.lastIndexOf('INLINE STATS');
      const freshnessIdx = queryStr.search(/@timestamp\s*>=\s*TO_DATETIME\(/);
      expect(freshnessIdx).toBeGreaterThan(lastInlineStatsIdx);
    });

    it('phase-1 ES|QL omits the freshness filter when includeExpired is true', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['id-1']],
      });
      esClient.search.mockResolvedValue({ hits: { hits: [], total: { value: 0 } } });
      const { client } = createFeatureClient({ esClient });

      await client.findFeatures('logs.test', 'http', {
        searchMode: 'keyword',
        includeExpired: true,
      });

      const queryStr = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
      expect(queryStr).not.toMatch(/@timestamp\s*>=\s*TO_DATETIME\(/);
      expect(queryStr).toMatch(/feature\.deleted.*IS NULL.*feature\.deleted.*==\s*false/is);
    });
  });

  describe('findDuplicateFeature()', () => {
    it('returns a duplicate by id (case-insensitive)', () => {
      const { client } = createFeatureClient();
      const existing = createFeature({ id: 'Feat-1' });
      const dup = client.findDuplicateFeature({
        existingFeatures: [existing],
        feature: createFeature({ id: 'feat-1' }),
      });
      expect(dup).toBe(existing);
    });

    it('returns undefined when no duplicate exists', () => {
      const { client } = createFeatureClient();
      const dup = client.findDuplicateFeature({
        existingFeatures: [createFeature({ id: 'feat-1', subtype: 'a' })],
        feature: createFeature({ id: 'feat-2', subtype: 'b' }),
      });
      expect(dup).toBeUndefined();
    });
  });

  describe('getFeatureHistory()', () => {
    const makeDoc = (overrides: Partial<StoredFeatureDoc>): StoredFeatureDoc => ({
      '@timestamp': '2024-01-01T00:00:00.000Z',
      'feature.id': 'feat-1',
      'stream.name': 'logs.test',
      'feature.type': 'service',
      'feature.description': 'desc',
      'feature.properties': {},
      'feature.confidence': 80,
      ...overrides,
    });

    it('returns empty when ES|QL returns no columns', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
      const { client } = createFeatureClient({ esClient });

      const result = await client.getFeatureHistory('logs.test', 'feat-1');
      expect(result).toEqual([]);
    });

    it('classifies a single entry with no run_id as new', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(
        makeEsqlSourceResponse([makeDoc({ '@timestamp': '2024-01-01T00:00:00.000Z' })])
      );
      const { client } = createFeatureClient({ esClient });

      const result = await client.getFeatureHistory('logs.test', 'feat-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ change_type: 'new' });
    });

    it('classifies the first occurrence of a run_id as new', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(
        makeEsqlSourceResponse([
          makeDoc({ '@timestamp': '2024-01-01T00:00:00.000Z', 'feature.run_id': 'run-a' }),
        ])
      );
      const { client } = createFeatureClient({ esClient });

      const result = await client.getFeatureHistory('logs.test', 'feat-1');
      expect(result[0]).toMatchObject({ change_type: 'new', run_id: 'run-a' });
    });

    it('classifies subsequent entries with the same run_id as updated', async () => {
      // docs in DESC order (newest first) as ES returns them
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(
        makeEsqlSourceResponse([
          makeDoc({ '@timestamp': '2024-01-03T00:00:00.000Z', 'feature.run_id': 'run-a' }),
          makeDoc({ '@timestamp': '2024-01-02T00:00:00.000Z', 'feature.run_id': 'run-a' }),
          makeDoc({ '@timestamp': '2024-01-01T00:00:00.000Z', 'feature.run_id': 'run-a' }),
        ])
      );
      const { client } = createFeatureClient({ esClient });

      const result = await client.getFeatureHistory('logs.test', 'feat-1');
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ change_type: 'updated' }); // 3rd occurrence (newest)
      expect(result[1]).toMatchObject({ change_type: 'updated' }); // 2nd occurrence
      expect(result[2]).toMatchObject({ change_type: 'new' }); // 1st occurrence (oldest)
    });

    it('classifies entries across multiple run_ids correctly', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(
        makeEsqlSourceResponse([
          makeDoc({ '@timestamp': '2024-01-04T00:00:00.000Z', 'feature.run_id': 'run-b' }),
          makeDoc({ '@timestamp': '2024-01-03T00:00:00.000Z', 'feature.run_id': 'run-b' }),
          makeDoc({ '@timestamp': '2024-01-02T00:00:00.000Z', 'feature.run_id': 'run-a' }),
          makeDoc({ '@timestamp': '2024-01-01T00:00:00.000Z', 'feature.run_id': 'run-a' }),
        ])
      );
      const { client } = createFeatureClient({ esClient });

      const result = await client.getFeatureHistory('logs.test', 'feat-1');
      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject({ change_type: 'updated' }); // run-b 2nd
      expect(result[1]).toMatchObject({ change_type: 'new' }); // run-b 1st
      expect(result[2]).toMatchObject({ change_type: 'updated' }); // run-a 2nd
      expect(result[3]).toMatchObject({ change_type: 'new' }); // run-a 1st
    });

    it('classifies tombstones as deleted', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(
        makeEsqlSourceResponse([
          makeDoc({ '@timestamp': '2024-01-02T00:00:00.000Z', 'feature.deleted': true }),
          makeDoc({ '@timestamp': '2024-01-01T00:00:00.000Z', 'feature.run_id': 'run-a' }),
        ])
      );
      const { client } = createFeatureClient({ esClient });

      const result = await client.getFeatureHistory('logs.test', 'feat-1');
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ change_type: 'deleted' });
      expect(result[1]).toMatchObject({ change_type: 'new' });
    });

    it('classifies a re-emission after deletion as new when it uses a fresh run_id', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(
        makeEsqlSourceResponse([
          makeDoc({ '@timestamp': '2024-01-04T00:00:00.000Z', 'feature.run_id': 'run-b' }),
          makeDoc({ '@timestamp': '2024-01-03T00:00:00.000Z', 'feature.deleted': true }),
          makeDoc({ '@timestamp': '2024-01-02T00:00:00.000Z', 'feature.run_id': 'run-a' }),
          makeDoc({ '@timestamp': '2024-01-01T00:00:00.000Z', 'feature.run_id': 'run-a' }),
        ])
      );
      const { client } = createFeatureClient({ esClient });

      const result = await client.getFeatureHistory('logs.test', 'feat-1');
      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject({ change_type: 'new' }); // run-b 1st after deletion
      expect(result[1]).toMatchObject({ change_type: 'deleted' }); // tombstone
      expect(result[2]).toMatchObject({ change_type: 'updated' }); // run-a 2nd
      expect(result[3]).toMatchObject({ change_type: 'new' }); // run-a 1st
    });

    it('treats each entry with undefined run_id as a separate new entry', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(
        makeEsqlSourceResponse([
          makeDoc({ '@timestamp': '2024-01-02T00:00:00.000Z' }), // no run_id
          makeDoc({ '@timestamp': '2024-01-01T00:00:00.000Z' }), // no run_id
        ])
      );
      const { client } = createFeatureClient({ esClient });

      const result = await client.getFeatureHistory('logs.test', 'feat-1');
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ change_type: 'new' });
      expect(result[1]).toMatchObject({ change_type: 'new' });
    });

    it('returns entries in DESC timestamp order matching the ES response', async () => {
      const esClient = createMockEsClient();
      esClient.esql.query.mockResolvedValue(
        makeEsqlSourceResponse([
          makeDoc({ '@timestamp': '2024-01-03T00:00:00.000Z', 'feature.run_id': 'run-a' }),
          makeDoc({ '@timestamp': '2024-01-02T00:00:00.000Z', 'feature.run_id': 'run-a' }),
          makeDoc({ '@timestamp': '2024-01-01T00:00:00.000Z', 'feature.run_id': 'run-a' }),
        ])
      );
      const { client } = createFeatureClient({ esClient });

      const result = await client.getFeatureHistory('logs.test', 'feat-1');
      expect(result.map((e) => e['@timestamp'])).toEqual([
        '2024-01-03T00:00:00.000Z',
        '2024-01-02T00:00:00.000Z',
        '2024-01-01T00:00:00.000Z',
      ]);
    });
  });
});
