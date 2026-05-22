/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { BulkOperationError, type IStorageClient } from '@kbn/storage-adapter';

jest.mock('timers/promises', () => ({
  setTimeout: jest.fn().mockResolvedValue(undefined),
}));
import type { Feature } from '@kbn/streams-schema';
import {
  STREAM_NAME,
  FEATURE_ID,
  FEATURE_UUID,
  FEATURE_TYPE,
  FEATURE_SUBTYPE,
  FEATURE_TITLE,
  FEATURE_DESCRIPTION,
  FEATURE_PROPERTIES,
  FEATURE_CONFIDENCE,
  FEATURE_EVIDENCE,
  FEATURE_EVIDENCE_DOC_IDS,
  FEATURE_STATUS,
  FEATURE_LAST_SEEN,
  FEATURE_TAGS,
  FEATURE_EXPIRES_AT,
  FEATURE_EXCLUDED_AT,
  FEATURE_SEARCH_EMBEDDING,
} from './fields';
import { FeatureClient, buildSearchEmbeddingText } from './feature_client';
import type { FeatureStorageSettings } from './storage_settings';
import type { StoredFeature } from './stored_feature';

// ==================== Helpers ====================

const createMockLogger = () => loggerMock.create();

const createMockStorageClient = () => ({
  search: jest.fn().mockResolvedValue({ hits: { hits: [], total: { value: 0 } } }),
  bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
  index: jest.fn(),
  delete: jest.fn().mockResolvedValue({ result: 'deleted', acknowledged: true }),
  clean: jest.fn(),
  get: jest.fn(),
  existsIndex: jest.fn(),
});

const createFeatureClient = ({
  storageClient = createMockStorageClient(),
  logger = createMockLogger(),
  config,
}: {
  storageClient?: ReturnType<typeof createMockStorageClient>;
  logger?: ReturnType<typeof createMockLogger>;
  config?: {
    feature_ttl_days: number;
    semantic_min_score: number;
    rrf_rank_constant: number;
  };
} = {}) => {
  const client = new FeatureClient(
    {
      storageClient: storageClient as unknown as IStorageClient<
        FeatureStorageSettings,
        StoredFeature
      >,
      logger: logger as unknown as Logger,
    },
    config
  );
  return { client, storageClient, logger };
};

const createFeature = (overrides: Partial<Feature> = {}): Feature => ({
  id: 'feat-1',
  uuid: 'uuid-1',
  stream_name: 'logs.test',
  type: 'service',
  subtype: 'http',
  title: 'HTTP service',
  description: 'Detected HTTP traffic',
  properties: { protocol: 'http' },
  confidence: 80,
  evidence: ['evidence-1'],
  evidence_doc_ids: ['doc-1'],
  status: 'active',
  last_seen: '2024-01-01T00:00:00.000Z',
  tags: ['tag-a'],
  ...overrides,
});

const createStoredFeature = (overrides: Partial<StoredFeature> = {}): StoredFeature =>
  ({
    [FEATURE_UUID]: 'uuid-1',
    [FEATURE_ID]: 'feat-1',
    [STREAM_NAME]: 'logs.test',
    [FEATURE_TYPE]: 'service',
    [FEATURE_SUBTYPE]: 'http',
    [FEATURE_TITLE]: 'HTTP service',
    [FEATURE_DESCRIPTION]: 'Detected HTTP traffic',
    [FEATURE_PROPERTIES]: { protocol: 'http' },
    [FEATURE_CONFIDENCE]: 80,
    [FEATURE_EVIDENCE]: ['evidence-1'],
    [FEATURE_EVIDENCE_DOC_IDS]: ['doc-1'],
    [FEATURE_STATUS]: 'active',
    [FEATURE_LAST_SEEN]: '2024-01-01T00:00:00.000Z',
    [FEATURE_TAGS]: ['tag-a'],
    ...overrides,
  } as StoredFeature);

const toSearchHit = (doc: StoredFeature) => ({
  _id: doc[FEATURE_UUID],
  _source: doc,
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
  describe('clean()', () => {
    it('delegates to storageClient.clean()', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.clean();
      expect(storageClient.clean).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFeatures()', () => {
    it('returns empty result without hitting storage when stream list is empty', async () => {
      const { client, storageClient } = createFeatureClient();
      const result = await client.getFeatures([]);
      expect(result).toEqual({ hits: [], total: 0 });
      expect(storageClient.search).not.toHaveBeenCalled();
    });

    it('maps stored documents back to Feature shape', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({
        hits: { hits: [toSearchHit(createStoredFeature())], total: { value: 1 } },
      });
      const { client } = createFeatureClient({ storageClient });

      const result = await client.getFeatures('logs.test');

      expect(result.total).toBe(1);
      expect(result.hits).toEqual([
        {
          uuid: 'uuid-1',
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
          status: 'active',
          last_seen: '2024-01-01T00:00:00.000Z',
          tags: ['tag-a'],
          meta: undefined,
          expires_at: undefined,
          excluded_at: undefined,
          filter: undefined,
        },
      ]);
    });

    it('filters by stream name(s)', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.getFeatures(['logs.a', 'logs.b']);

      const filter = storageClient.search.mock.calls[0][0].query.bool.filter;
      expect(filter).toContainEqual({ terms: { [STREAM_NAME]: ['logs.a', 'logs.b'] } });
    });

    it('filters by ids when provided', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.getFeatures('logs.test', { id: ['feat-1', 'feat-2'] });

      const filter = storageClient.search.mock.calls[0][0].query.bool.filter;
      expect(filter).toContainEqual({ terms: { [FEATURE_ID]: ['feat-1', 'feat-2'] } });
    });

    it('filters by type when provided', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.getFeatures('logs.test', { type: ['service', 'host'] });

      const filter = storageClient.search.mock.calls[0][0].query.bool.filter;
      const typeFilter = filter.find((f: Record<string, unknown>) => {
        const should = (f?.bool as Record<string, unknown>)?.should as
          | Array<Record<string, unknown>>
          | undefined;
        return should?.some(
          (s) => (s?.term as Record<string, unknown>)?.[FEATURE_TYPE] !== undefined
        );
      });
      expect(typeFilter).toBeDefined();
    });

    it('filters by minConfidence when provided', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.getFeatures('logs.test', { minConfidence: 50 });

      const filter = storageClient.search.mock.calls[0][0].query.bool.filter;
      expect(filter).toContainEqual({ range: { [FEATURE_CONFIDENCE]: { gte: 50 } } });
    });

    it('excludes expired and excluded features by default', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.getFeatures('logs.test');

      const filter = storageClient.search.mock.calls[0][0].query.bool.filter;
      const excludedFilter = filter.find(
        (f: Record<string, unknown>) =>
          (f?.bool as Record<string, Record<string, Record<string, string>>>)?.must_not?.exists
            ?.field === FEATURE_EXCLUDED_AT
      );
      expect(excludedFilter).toBeDefined();
      // Expiry filter is a bool.should clause referencing FEATURE_EXPIRES_AT
      const expiredFilter = filter.find((f: Record<string, unknown>) =>
        JSON.stringify(f).includes(FEATURE_EXPIRES_AT)
      );
      expect(expiredFilter).toBeDefined();
    });

    it('does not apply expiry filter when includeExpired=true', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.getFeatures('logs.test', { includeExpired: true });

      const filter = storageClient.search.mock.calls[0][0].query.bool.filter;
      const expiredFilter = filter.find((f: Record<string, unknown>) =>
        JSON.stringify(f).includes(FEATURE_EXPIRES_AT)
      );
      expect(expiredFilter).toBeUndefined();
    });

    it('does not apply excluded filter when includeExcluded=true', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.getFeatures('logs.test', { includeExcluded: true });

      const filter = storageClient.search.mock.calls[0][0].query.bool.filter;
      const excludedFilter = filter.find(
        (f: Record<string, unknown>) =>
          (f?.bool as Record<string, Record<string, Record<string, string>>>)?.must_not?.exists
            ?.field === FEATURE_EXCLUDED_AT
      );
      expect(excludedFilter).toBeUndefined();
    });

    it('sorts by confidence descending', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.getFeatures('logs.test');

      const sort = storageClient.search.mock.calls[0][0].sort;
      expect(sort).toEqual([{ [FEATURE_CONFIDENCE]: { order: 'desc' } }]);
    });
  });

  describe('getFeature()', () => {
    it('returns the mapped feature when found and stream matches', async () => {
      const storageClient = createMockStorageClient();
      storageClient.get.mockResolvedValue({ _source: createStoredFeature() });
      const { client } = createFeatureClient({ storageClient });

      const feature = await client.getFeature('logs.test', 'uuid-1');

      expect(feature.uuid).toBe('uuid-1');
      expect(feature.stream_name).toBe('logs.test');
    });

    it('throws 404 when storage reports the document is missing', async () => {
      const storageClient = createMockStorageClient();
      const notFound = Object.assign(new Error('not found'), { statusCode: 404 });
      storageClient.get.mockRejectedValue(notFound);
      const { client } = createFeatureClient({ storageClient });

      await expect(client.getFeature('logs.test', 'uuid-1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('throws 404 when the stored feature belongs to a different stream', async () => {
      const storageClient = createMockStorageClient();
      storageClient.get.mockResolvedValue({
        _source: createStoredFeature({ [STREAM_NAME]: 'logs.other' }),
      });
      const { client } = createFeatureClient({ storageClient });

      await expect(client.getFeature('logs.test', 'uuid-1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('getExcludedFeatures()', () => {
    it('filters by stream and requires excluded_at to exist', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.getExcludedFeatures('logs.test');

      const filter = storageClient.search.mock.calls[0][0].query.bool.filter;
      expect(filter).toContainEqual({ term: { [STREAM_NAME]: 'logs.test' } });
      expect(filter).toContainEqual({ exists: { field: FEATURE_EXCLUDED_AT } });
    });

    it('sorts by excluded_at descending', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.getExcludedFeatures('logs.test');

      const sort = storageClient.search.mock.calls[0][0].sort;
      expect(sort).toEqual([{ [FEATURE_EXCLUDED_AT]: { order: 'desc' } }]);
    });
  });

  describe('bulk()', () => {
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

    it('passes index operations through to storage with throwOnFail and stable _id', async () => {
      const { client, storageClient } = createFeatureClient();

      await client.bulk('logs.test', [{ index: { feature: createFeature() } }]);

      const call = storageClient.bulk.mock.calls[0][0];
      expect(call.throwOnFail).toBe(true);
      expect(call.operations).toHaveLength(1);
      const op = call.operations[0];
      expect(op.index._id).toBe('uuid-1');
      expect(op.index.document[STREAM_NAME]).toBe('logs.test');
      expect(op.index.document[FEATURE_UUID]).toBe('uuid-1');
    });

    it('translates a delete operation into a storage delete (when the feature exists in the stream)', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _id: 'uuid-1', _source: createStoredFeature() }] },
      });
      const { client } = createFeatureClient({ storageClient });

      await client.bulk('logs.test', [{ delete: { id: 'uuid-1' } }]);

      const call = storageClient.bulk.mock.calls[0][0];
      expect(call.operations).toEqual([{ delete: { _id: 'uuid-1' } }]);
    });

    it('drops delete/exclude/restore operations whose target does not belong to the stream', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValueOnce({ hits: { hits: [] } });
      const { client } = createFeatureClient({ storageClient });

      const result = await client.bulk('logs.test', [
        { delete: { id: 'uuid-missing' } },
        { exclude: { id: 'uuid-missing' } },
        { restore: { id: 'uuid-missing' } },
      ]);

      expect(result).toEqual({ applied: 0, skipped: 3 });
      expect(storageClient.bulk).not.toHaveBeenCalled();
    });

    it('skips exclude/restore for computed features (server protects type invariants)', async () => {
      const storageClient = createMockStorageClient();
      const computed = createStoredFeature({ [FEATURE_TYPE]: 'log_patterns' });
      storageClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _id: 'uuid-1', _source: computed }] },
      });
      const { client } = createFeatureClient({ storageClient });

      const result = await client.bulk('logs.test', [{ exclude: { id: 'uuid-1' } }]);

      expect(result).toEqual({ applied: 0, skipped: 1 });
      expect(storageClient.bulk).not.toHaveBeenCalled();
    });

    it('translates exclude into an index op that stamps excluded_at on a non-computed feature', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _id: 'uuid-1', _source: createStoredFeature() }] },
      });
      const { client } = createFeatureClient({ storageClient });

      await client.bulk('logs.test', [{ exclude: { id: 'uuid-1' } }]);

      const call = storageClient.bulk.mock.calls[0][0];
      expect(call.operations).toHaveLength(1);
      const op = call.operations[0];
      expect(op.index).toBeDefined();
      expect(op.index.document[FEATURE_EXCLUDED_AT]).toEqual(expect.any(String));
    });

    it('translates restore into an index op that clears excluded_at and refreshes last_seen/expires_at', async () => {
      const storageClient = createMockStorageClient();
      const stored = createStoredFeature({ [FEATURE_EXCLUDED_AT]: '2024-01-01T00:00:00.000Z' });
      storageClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _id: 'uuid-1', _source: stored }] },
      });
      const { client } = createFeatureClient({ storageClient });

      await client.bulk('logs.test', [{ restore: { id: 'uuid-1' } }]);

      const call = storageClient.bulk.mock.calls[0][0];
      expect(call.operations).toHaveLength(1);
      const op = call.operations[0];
      expect(op.index.document[FEATURE_EXCLUDED_AT]).toBeUndefined();
      expect(op.index.document[FEATURE_LAST_SEEN]).toEqual(expect.any(String));
      expect(op.index.document[FEATURE_EXPIRES_AT]).toEqual(expect.any(String));
    });
  });

  describe('deleteFeature()', () => {
    it('looks the feature up via getFeature, then issues a storage delete by uuid', async () => {
      const storageClient = createMockStorageClient();
      storageClient.get.mockResolvedValue({ _source: createStoredFeature() });
      const { client } = createFeatureClient({ storageClient });

      await client.deleteFeature('logs.test', 'uuid-1');

      expect(storageClient.get).toHaveBeenCalledWith({ id: 'uuid-1' });
      expect(storageClient.delete).toHaveBeenCalledWith({ id: 'uuid-1' });
    });
  });

  describe('deleteFeatures()', () => {
    it('lists every feature for the stream (including excluded/expired) and bulk-deletes them', async () => {
      const storageClient = createMockStorageClient();
      const stored = [
        createStoredFeature({ [FEATURE_UUID]: 'uuid-a' }),
        createStoredFeature({ [FEATURE_UUID]: 'uuid-b' }),
      ];
      storageClient.search.mockResolvedValue({
        hits: { hits: stored.map(toSearchHit), total: { value: stored.length } },
      });
      const { client } = createFeatureClient({ storageClient });

      await client.deleteFeatures('logs.test');

      const searchArgs = storageClient.search.mock.calls[0][0];
      expect(
        searchArgs.query.bool.filter.find(
          (f: Record<string, unknown>) => (f?.bool as Record<string, unknown>)?.must_not
        )
      ).toBeUndefined();

      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [{ delete: { _id: 'uuid-a' } }, { delete: { _id: 'uuid-b' } }],
      });
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

  describe('findFeatures() — query shape per mode', () => {
    it('returns empty without hitting storage when stream list is empty', async () => {
      const { client, storageClient } = createFeatureClient();
      const result = await client.findFeatures([], 'http');
      expect(result).toEqual({ hits: [], total: 0 });
      expect(storageClient.search).not.toHaveBeenCalled();
    });

    it('keyword mode issues a top-level keyword query (no retriever)', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.findFeatures('logs.test', 'http', { searchMode: 'keyword' });

      const args = storageClient.search.mock.calls[0][0];
      expect(args.query).toBeDefined();
      expect(args.retriever).toBeUndefined();
    });

    it('semantic mode issues a standard retriever against the embedding field', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.findFeatures('logs.test', 'http', { searchMode: 'semantic' });

      const args = storageClient.search.mock.calls[0][0];
      expect(args.retriever?.linear).toBeDefined();
      expect(JSON.stringify(args.retriever)).toContain(FEATURE_SEARCH_EMBEDDING);
    });

    it('hybrid mode issues an RRF retriever combining keyword and semantic legs', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.findFeatures('logs.test', 'http', { searchMode: 'hybrid' });

      const args = storageClient.search.mock.calls[0][0];
      expect(args.retriever?.rrf?.retrievers).toHaveLength(2);
    });

    it('defaults to hybrid when no searchMode is provided', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.findFeatures('logs.test', 'http');

      const args = storageClient.search.mock.calls[0][0];
      expect(args.retriever?.rrf?.retrievers).toHaveLength(2);
    });

    it('propagates the error when an explicit search mode fails', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockRejectedValue(new Error('boom'));
      const { client } = createFeatureClient({ storageClient });

      await expect(
        client.findFeatures('logs.test', 'http', { searchMode: 'semantic' })
      ).rejects.toThrow('boom');
    });

    it('falls back to keyword search when an auto-resolved non-keyword mode throws', async () => {
      const storageClient = createMockStorageClient();
      const logger = createMockLogger();
      storageClient.search
        .mockRejectedValueOnce(new Error('retriever parse error'))
        .mockResolvedValueOnce({ hits: { hits: [], total: { value: 0 } } });
      const { client } = createFeatureClient({ storageClient, logger });

      await client.findFeatures('logs.test', 'http');

      expect(storageClient.search).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('falling back to keyword'));
      const fallbackArgs = storageClient.search.mock.calls[1][0];
      expect(fallbackArgs.query).toBeDefined();
      expect(fallbackArgs.retriever).toBeUndefined();
    });

    it('passes the limit through to the size argument', async () => {
      const { client, storageClient } = createFeatureClient();
      await client.findFeatures('logs.test', 'http', {
        searchMode: 'keyword',
        limit: 25,
      });

      const args = storageClient.search.mock.calls[0][0];
      expect(args.size).toBe(25);
    });
  });

  describe('bulk() inference fallback behaviour', () => {
    it('includes the embedding field in the document on the first bulk attempt', async () => {
      const { client, storageClient } = createFeatureClient();

      await client.bulk('logs.test', [{ index: { feature: createFeature() } }]);

      expect(storageClient.bulk).toHaveBeenCalledTimes(1);
      const document = storageClient.bulk.mock.calls[0][0].operations[0].index.document;
      expect(document[FEATURE_SEARCH_EMBEDDING]).toEqual(expect.any(String));
    });

    it('retries with the embedding field after a transient inference-related BulkOperationError', async () => {
      const storageClient = createMockStorageClient();
      const logger = createMockLogger();
      const inferenceError = new BulkOperationError('inference unavailable', {
        errors: true,
        took: 0,
        items: [
          {
            index: {
              _index: '.kibana_streams_features',
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
      });
      storageClient.bulk
        .mockRejectedValueOnce(inferenceError)
        .mockResolvedValueOnce({ errors: false, items: [] });
      const { client } = createFeatureClient({ storageClient, logger });

      await client.bulk('logs.test', [{ index: { feature: createFeature() } }]);

      expect(storageClient.bulk).toHaveBeenCalledTimes(2);
      const firstDoc = storageClient.bulk.mock.calls[0][0].operations[0].index.document;
      const secondDoc = storageClient.bulk.mock.calls[1][0].operations[0].index.document;
      expect(firstDoc[FEATURE_SEARCH_EMBEDDING]).toEqual(expect.any(String));
      expect(secondDoc[FEATURE_SEARCH_EMBEDDING]).toEqual(expect.any(String));
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('retrying in 2000ms (attempt 1/3)')
      );
    });

    it('falls back to writing without the embedding only after every backoff retry fails', async () => {
      const storageClient = createMockStorageClient();
      const logger = createMockLogger();
      const inferenceError = new BulkOperationError('inference unavailable', {
        errors: true,
        took: 0,
        items: [
          {
            index: {
              _index: '.kibana_streams_features',
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
      });
      storageClient.bulk
        .mockRejectedValueOnce(inferenceError)
        .mockRejectedValueOnce(inferenceError)
        .mockRejectedValueOnce(inferenceError)
        .mockResolvedValueOnce({ errors: false, items: [] });
      const { client } = createFeatureClient({ storageClient, logger });

      await client.bulk('logs.test', [{ index: { feature: createFeature() } }]);

      expect(storageClient.bulk).toHaveBeenCalledTimes(4);
      const firstDoc = storageClient.bulk.mock.calls[0][0].operations[0].index.document;
      const fallbackDoc = storageClient.bulk.mock.calls[3][0].operations[0].index.document;
      expect(firstDoc[FEATURE_SEARCH_EMBEDDING]).toEqual(expect.any(String));
      // FEATURE_SEARCH_EMBEDDING contains a dot, so we cannot use toHaveProperty
      // (Jest treats dotted strings as nested paths).
      expect(FEATURE_SEARCH_EMBEDDING in fallbackDoc).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'after 3 attempts -- falling back to writing without semantic_text embedding'
        )
      );
    });

    it('does not retry when the bulk write throws a non-BulkOperationError', async () => {
      const storageClient = createMockStorageClient();
      storageClient.bulk.mockRejectedValue(new Error('cluster unreachable'));
      const { client } = createFeatureClient({ storageClient });

      await expect(
        client.bulk('logs.test', [{ index: { feature: createFeature() } }])
      ).rejects.toThrow('cluster unreachable');
      expect(storageClient.bulk).toHaveBeenCalledTimes(1);
    });
  });
});
