/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { BulkOperationError, type IStorageClient } from '@kbn/storage-adapter';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import { QUERY_TYPE_STATS } from '@kbn/streams-schema/src/queries';
import type { QueryStorageSettings } from '../storage_settings';
import {
  ASSET_ID,
  ASSET_TYPE,
  ASSET_UUID,
  QUERY_DESCRIPTION,
  QUERY_ESQL_QUERY,
  QUERY_EVIDENCE,
  QUERY_FEATURE_FILTER,
  QUERY_FEATURE_NAME,
  QUERY_FEATURE_TYPE,
  QUERY_KQL_BODY,
  QUERY_SEARCH_EMBEDDING,
  QUERY_SEVERITY_SCORE,
  QUERY_TITLE,
  QUERY_TYPE,
  RULE_BACKED,
  RULE_ID,
  STREAM_NAME,
} from '../fields';
import {
  buildSearchEmbeddingText,
  getQueryLinkUuid,
  QueryClient,
  type StoredQueryLink,
} from './query_client';
import type { IRulesManagementClient } from './rules_management_client';
import { computeRuleId } from './helpers/query';

// ==================== Helpers ====================

jest.mock('timers/promises', () => ({
  setTimeout: jest.fn().mockResolvedValue(undefined),
}));

const createMockLogger = () => loggerMock.create();

const createMockStorageClient = () => ({
  search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
  bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
  index: jest.fn(),
  delete: jest.fn().mockResolvedValue({ result: 'deleted', acknowledged: true }),
  clean: jest.fn(),
  get: jest.fn(),
  existsIndex: jest.fn(),
});

const createMockDefinition = (name = 'logs.test'): Streams.all.Definition =>
  ({ name } as Streams.all.Definition);

const createQueryClient = ({
  storageClient = createMockStorageClient(),
  logger = createMockLogger(),
}: {
  storageClient?: ReturnType<typeof createMockStorageClient>;
  logger?: ReturnType<typeof createMockLogger>;
} = {}) => {
  const client = new QueryClient(
    {
      storageClient: storageClient as unknown as IStorageClient<
        QueryStorageSettings,
        StoredQueryLink
      >,
      soClient: {} as SavedObjectsClientContract,
      rulesManagementClient: {} as IRulesManagementClient,
      logger: logger as unknown as Logger,
    },
    true
  );
  return { client, storageClient, logger };
};

const createQuery = (overrides: Partial<StreamQuery> = {}): StreamQuery => ({
  id: 'test-query-id',
  type: 'match',
  title: 'SSH Brute Force Detection',
  description: 'Detects repeated failed SSH login attempts from a single source IP',
  esql: { query: 'FROM logs-* | WHERE event.action == "ssh_login" AND event.outcome == "failure"' },
  ...overrides,
});

/**
 * Simulates a document stored BEFORE the semantic search feature was added.
 * It has legacy fields (kql, feature/system) and no embedding.
 */
const createOldShapeStoredDoc = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  [ASSET_UUID]: 'uuid-old-1',
  [ASSET_ID]: 'query-old-1',
  [ASSET_TYPE]: 'query',
  [STREAM_NAME]: 'logs.test',
  [QUERY_TITLE]: 'SSH Failed Logins',
  [QUERY_DESCRIPTION]: 'Detects failed SSH login attempts',
  [QUERY_ESQL_QUERY]: 'FROM logs-* METADATA _id, _source | WHERE event.action == "ssh_login"',
  [QUERY_SEVERITY_SCORE]: 75,
  [QUERY_EVIDENCE]: ['sshd[24363]: Failed password for root'],
  [RULE_BACKED]: true,
  [RULE_ID]: 'rule-old-1',
  [QUERY_KQL_BODY]: 'event.action: "ssh_login"',
  [QUERY_FEATURE_NAME]: 'ssh',
  [QUERY_FEATURE_FILTER]: '{"field":"event.action","operator":"eq","value":"ssh_login"}',
  [QUERY_FEATURE_TYPE]: 'system',
  ...overrides,
});

/**
 * Simulates a document stored WITH the semantic search feature enabled.
 * Includes the embedding field.
 */
const createNewShapeStoredDoc = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  ...createOldShapeStoredDoc(),
  [ASSET_UUID]: 'uuid-new-1',
  [ASSET_ID]: 'query-new-1',
  [RULE_ID]: 'rule-new-1',
  [QUERY_SEARCH_EMBEDDING]:
    'Stream: logs.test\nTitle: SSH Failed Logins\nDescription: Detects failed SSH login attempts',
  ...overrides,
});

const toSearchHit = (doc: Record<string, unknown>) => ({
  _id: doc[ASSET_UUID] as string,
  _source: doc as StoredQueryLink,
});

// ==================== Tests ====================

describe('buildSearchEmbeddingText', () => {
  it('builds structured text with title and description', () => {
    const query = createQuery();
    const result = buildSearchEmbeddingText(query);

    expect(result).toBe(
      'Title: SSH Brute Force Detection\nDescription: Detects repeated failed SSH login attempts from a single source IP'
    );
  });

  it('includes only title when description is empty', () => {
    const query = createQuery({ description: '' });
    const result = buildSearchEmbeddingText(query);

    expect(result).toBe('Title: SSH Brute Force Detection');
  });

  it('includes only title when description is undefined', () => {
    const query = createQuery({ description: undefined });
    const result = buildSearchEmbeddingText(query);

    expect(result).toBe('Title: SSH Brute Force Detection');
  });

  it('prepends stream name when provided', () => {
    const query = createQuery();
    const result = buildSearchEmbeddingText(query, 'logs.otel');

    expect(result).toBe(
      'Stream: logs.otel\nTitle: SSH Brute Force Detection\nDescription: Detects repeated failed SSH login attempts from a single source IP'
    );
  });

  it('includes stream name but omits description when empty', () => {
    const query = createQuery({ description: '' });
    const result = buildSearchEmbeddingText(query, 'logs.ecs');

    expect(result).toBe('Stream: logs.ecs\nTitle: SSH Brute Force Detection');
  });
});

describe('QueryClient backward compatibility', () => {
  describe('reading old-shape documents (pre-semantic search)', () => {
    it('returns a clean QueryLink from an old-shape document without embedding', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({
        hits: { hits: [toSearchHit(createOldShapeStoredDoc())] },
      });
      const { client } = createQueryClient({ storageClient });

      const results = await client.getQueryLinks(['logs.test']);

      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result).toEqual({
        [ASSET_UUID]: 'uuid-old-1',
        [ASSET_ID]: 'query-old-1',
        [ASSET_TYPE]: 'query',
        stream_name: 'logs.test',
        rule_backed: true,
        rule_id: 'rule-old-1',
        query: {
          id: 'query-old-1',
          type: 'match',
          title: 'SSH Failed Logins',
          description: 'Detects failed SSH login attempts',
          esql: {
            query: 'FROM logs-* METADATA _id, _source | WHERE event.action == "ssh_login"',
          },
          severity_score: 75,
          evidence: ['sshd[24363]: Failed password for root'],
        },
      });
    });

    it('does not leak legacy storage fields to API response', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({
        hits: { hits: [toSearchHit(createOldShapeStoredDoc())] },
      });
      const { client } = createQueryClient({ storageClient });

      const [result] = await client.getQueryLinks(['logs.test']);

      const topLevelKeys = Object.keys(result);
      const storageOnlyFields = [
        QUERY_KQL_BODY,
        QUERY_FEATURE_NAME,
        QUERY_FEATURE_FILTER,
        QUERY_FEATURE_TYPE,
        QUERY_TITLE,
        QUERY_DESCRIPTION,
        QUERY_ESQL_QUERY,
        QUERY_SEVERITY_SCORE,
        QUERY_SEARCH_EMBEDDING,
        QUERY_EVIDENCE,
        STREAM_NAME,
      ];
      for (const field of storageOnlyFields) {
        expect(topLevelKeys).not.toContain(field);
      }
    });

    it('handles documents with missing optional fields', async () => {
      const storageClient = createMockStorageClient();
      const doc = createOldShapeStoredDoc({
        [QUERY_SEVERITY_SCORE]: undefined,
        [QUERY_EVIDENCE]: undefined,
      });
      storageClient.search.mockResolvedValue({
        hits: { hits: [toSearchHit(doc)] },
      });
      const { client } = createQueryClient({ storageClient });

      const [result] = await client.getQueryLinks(['logs.test']);

      expect(result.query.severity_score).toBeUndefined();
      expect(result.query.evidence).toBeUndefined();
    });
  });

  describe('reading new-shape documents (with embedding)', () => {
    it('strips query.search_embedding from the API response', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({
        hits: { hits: [toSearchHit(createNewShapeStoredDoc())] },
      });
      const { client } = createQueryClient({ storageClient });

      const [result] = await client.getQueryLinks(['logs.test']);

      expect(Object.keys(result)).not.toContain(QUERY_SEARCH_EMBEDDING);
      expect(result.query.title).toBe('SSH Failed Logins');
      expect(result.query.description).toBe('Detects failed SSH login attempts');
    });
  });

  describe('reading mixed-shape documents', () => {
    it('handles a mix of old and new shape documents in the same result set', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({
        hits: {
          hits: [toSearchHit(createOldShapeStoredDoc()), toSearchHit(createNewShapeStoredDoc())],
        },
      });
      const { client } = createQueryClient({ storageClient });

      const results = await client.getQueryLinks(['logs.test']);

      expect(results).toHaveLength(2);
      expect(results[0][ASSET_ID]).toBe('query-old-1');
      expect(results[1][ASSET_ID]).toBe('query-new-1');

      for (const result of results) {
        const topLevelKeys = Object.keys(result);
        expect(topLevelKeys).not.toContain(QUERY_SEARCH_EMBEDDING);
        expect(topLevelKeys).not.toContain(QUERY_KQL_BODY);
        expect(topLevelKeys).not.toContain(QUERY_FEATURE_NAME);
        expect(result.query).toBeDefined();
        expect(result.query.title).toBeDefined();
        expect(result.query.esql.query).toBeDefined();
      }
    });
  });

  describe('writing documents', () => {
    it('always populates query.search_embedding on the first bulk attempt', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({ hits: { hits: [] } });
      const { client } = createQueryClient({ storageClient });

      await client.syncQueryList(createMockDefinition(), [
        {
          [ASSET_ID]: 'q-1',
          [ASSET_TYPE]: 'query',
          query: createQuery({ id: 'q-1' }),
          rule_backed: true,
          rule_id: 'rule-1',
        },
      ]);

      const bulkCall = storageClient.bulk.mock.calls[0][0];
      const indexOp = bulkCall.operations[0];
      expect(indexOp.index).toBeDefined();
      const document = indexOp.index!.document;
      expect(document[QUERY_SEARCH_EMBEDDING]).toBe(
        'Stream: logs.test\nTitle: SSH Brute Force Detection\nDescription: Detects repeated failed SSH login attempts from a single source IP'
      );
      expect(document[QUERY_TITLE]).toBe('SSH Brute Force Detection');
    });

    it('generates correct embedding text for documents without description', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({ hits: { hits: [] } });
      const { client } = createQueryClient({ storageClient });

      await client.syncQueryList(createMockDefinition(), [
        {
          [ASSET_ID]: 'q-1',
          [ASSET_TYPE]: 'query',
          query: createQuery({ id: 'q-1', description: '' }),
          rule_backed: true,
          rule_id: 'rule-1',
        },
      ]);

      const bulkCall = storageClient.bulk.mock.calls[0][0];
      const document = bulkCall.operations[0].index!.document;
      expect(document[QUERY_SEARCH_EMBEDDING]).toBe(
        'Stream: logs.test\nTitle: SSH Brute Force Detection'
      );
    });

    it('retries the bulk write with the embedding field after a transient inference-related BulkOperationError', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({ hits: { hits: [] } });
      const inferenceError = new BulkOperationError(
        'Unable to find model deployment task [elser-endpoint]',
        {
          errors: true,
          took: 0,
          items: [
            {
              index: {
                _index: '.kibana_streams_assets',
                _id: 'doc-1',
                status: 500,
                error: {
                  type: 'exception',
                  reason:
                    'Exception when running inference id [elser-endpoint] on field [query.search_embedding]',
                  caused_by: {
                    type: 'status_exception',
                    reason: 'Unable to find model deployment task [elser-endpoint]',
                  },
                },
              },
            },
          ],
        }
      );
      storageClient.bulk
        .mockRejectedValueOnce(inferenceError)
        .mockResolvedValueOnce({ errors: false, items: [] });
      const logger = createMockLogger();
      const { client } = createQueryClient({ storageClient, logger });

      await client.syncQueryList(createMockDefinition(), [
        {
          [ASSET_ID]: 'q-1',
          [ASSET_TYPE]: 'query',
          query: createQuery({ id: 'q-1' }),
          rule_backed: true,
          rule_id: 'rule-1',
        },
      ]);

      expect(storageClient.bulk).toHaveBeenCalledTimes(2);
      const firstDoc = storageClient.bulk.mock.calls[0][0].operations[0].index!.document;
      const secondDoc = storageClient.bulk.mock.calls[1][0].operations[0].index!.document;
      expect(firstDoc[QUERY_SEARCH_EMBEDDING]).toEqual(expect.any(String));
      expect(secondDoc[QUERY_SEARCH_EMBEDDING]).toEqual(expect.any(String));
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('retrying in 2000ms (attempt 1/3)')
      );
    });

    it('falls back to writing without the embedding only after every backoff retry fails', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({ hits: { hits: [] } });
      const inferenceError = new BulkOperationError(
        'Unable to find model deployment task [elser-endpoint]',
        {
          errors: true,
          took: 0,
          items: [
            {
              index: {
                _index: '.kibana_streams_assets',
                _id: 'doc-1',
                status: 500,
                error: {
                  type: 'exception',
                  reason:
                    'Exception when running inference id [elser-endpoint] on field [query.search_embedding]',
                  caused_by: {
                    type: 'status_exception',
                    reason: 'Unable to find model deployment task [elser-endpoint]',
                  },
                },
              },
            },
          ],
        }
      );
      storageClient.bulk
        .mockRejectedValueOnce(inferenceError)
        .mockRejectedValueOnce(inferenceError)
        .mockRejectedValueOnce(inferenceError)
        .mockResolvedValueOnce({ errors: false, items: [] });
      const logger = createMockLogger();
      const { client } = createQueryClient({ storageClient, logger });

      await client.syncQueryList(createMockDefinition(), [
        {
          [ASSET_ID]: 'q-1',
          [ASSET_TYPE]: 'query',
          query: createQuery({ id: 'q-1' }),
          rule_backed: true,
          rule_id: 'rule-1',
        },
      ]);

      expect(storageClient.bulk).toHaveBeenCalledTimes(4);
      const firstDoc = storageClient.bulk.mock.calls[0][0].operations[0].index!.document;
      const fallbackDoc = storageClient.bulk.mock.calls[3][0].operations[0].index!.document;
      expect(firstDoc[QUERY_SEARCH_EMBEDDING]).toEqual(expect.any(String));
      // QUERY_SEARCH_EMBEDDING contains a dot, so we cannot use toHaveProperty
      // (Jest treats dotted strings as nested paths).
      expect(QUERY_SEARCH_EMBEDDING in fallbackDoc).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'after 3 attempts -- falling back to writing without semantic_text embedding'
        )
      );
    });

    it('propagates non-BulkOperationError failures without retrying', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({ hits: { hits: [] } });
      storageClient.bulk.mockRejectedValueOnce(new Error('connection reset'));
      const { client } = createQueryClient({ storageClient });

      await expect(
        client.syncQueryList(createMockDefinition(), [
          {
            [ASSET_ID]: 'q-1',
            [ASSET_TYPE]: 'query',
            query: createQuery({ id: 'q-1' }),
            rule_backed: true,
            rule_id: 'rule-1',
          },
        ])
      ).rejects.toThrow('connection reset');

      expect(storageClient.bulk).toHaveBeenCalledTimes(1);
    });
  });

  describe('search mode resolution', () => {
    it('defaults to hybrid search when no searchMode is provided', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({ hits: { hits: [] } });
      const { client } = createQueryClient({ storageClient });

      await client.findQueries(['logs.test'], 'SSH');

      const searchArgs = storageClient.search.mock.calls[0][0];
      expect(searchArgs.retriever?.rrf).toBeDefined();
    });

    it('uses keyword search when explicitly requested', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({ hits: { hits: [] } });
      const { client } = createQueryClient({ storageClient });

      await client.findQueries(['logs.test'], 'SSH', undefined, 'keyword');

      const searchArgs = storageClient.search.mock.calls[0][0];
      expect(searchArgs.query).toBeDefined();
      expect(searchArgs.retriever).toBeUndefined();
    });

    it('uses semantic search when explicitly requested', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({ hits: { hits: [] } });
      const { client } = createQueryClient({ storageClient });

      await client.findQueries(['logs.test'], 'SSH', undefined, 'semantic');

      const searchArgs = storageClient.search.mock.calls[0][0];
      expect(searchArgs.retriever?.linear).toBeDefined();
    });

    it('falls back to keyword when auto-resolved hybrid search throws an error', async () => {
      const storageClient = createMockStorageClient();
      const logger = createMockLogger();
      storageClient.search
        .mockRejectedValueOnce(new Error('retriever parse error'))
        .mockResolvedValueOnce({ hits: { hits: [] } });
      const { client } = createQueryClient({ storageClient, logger });

      const results = await client.findQueries(['logs.test'], 'SSH');

      expect(storageClient.search).toHaveBeenCalledTimes(2);
      expect(results).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('falling back to keyword'));
    });

    it('propagates the error when an explicit searchMode fails', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockRejectedValue(new Error('inference unavailable'));
      const { client } = createQueryClient({ storageClient });

      await expect(client.findQueries(['logs.test'], 'SSH', undefined, 'semantic')).rejects.toThrow(
        'inference unavailable'
      );
    });

    it('propagates the error when keyword search itself throws', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockRejectedValue(new Error('index not found'));
      const { client } = createQueryClient({ storageClient });

      await expect(client.findQueries(['logs.test'], 'SSH')).rejects.toThrow('index not found');
    });
  });

  describe('severity filtering via minSeverityScore', () => {
    describe('getQueryLinks with minSeverityScore', () => {
      it('includes a range filter when minSeverityScore is provided', async () => {
        const storageClient = createMockStorageClient();
        storageClient.search.mockResolvedValue({ hits: { hits: [] } });
        const { client } = createQueryClient({ storageClient });

        await client.getQueryLinks(['logs.test'], { minSeverityScore: 60 });

        const searchArgs = storageClient.search.mock.calls[0][0];
        const filter: unknown[] = searchArgs.query.bool.filter;
        const rangeFilter = filter.find(
          (f) =>
            typeof f === 'object' &&
            f !== null &&
            'range' in f &&
            QUERY_SEVERITY_SCORE in ((f as Record<string, unknown>).range as object)
        );
        expect(rangeFilter).toEqual({ range: { [QUERY_SEVERITY_SCORE]: { gte: 60 } } });
      });

      it('excludes the range filter when minSeverityScore is omitted', async () => {
        const storageClient = createMockStorageClient();
        storageClient.search.mockResolvedValue({ hits: { hits: [] } });
        const { client } = createQueryClient({ storageClient });

        await client.getQueryLinks(['logs.test']);

        const searchArgs = storageClient.search.mock.calls[0][0];
        const filter: unknown[] = searchArgs.query.bool.filter;
        const rangeFilter = filter.find(
          (f) =>
            typeof f === 'object' &&
            f !== null &&
            'range' in f &&
            QUERY_SEVERITY_SCORE in ((f as Record<string, unknown>).range as object)
        );
        expect(rangeFilter).toBeUndefined();
      });
    });

    describe('getPromotableUnbackedQueries with minSeverityScore', () => {
      it('passes minSeverityScore through to the underlying search', async () => {
        const storageClient = createMockStorageClient();
        storageClient.search.mockResolvedValue({ hits: { hits: [] } });
        const { client } = createQueryClient({ storageClient });

        await client.getPromotableUnbackedQueries({ minSeverityScore: 60 });

        const searchArgs = storageClient.search.mock.calls[0][0];
        const filter: unknown[] = searchArgs.query.bool.filter;
        expect(filter).toContainEqual({ range: { [QUERY_SEVERITY_SCORE]: { gte: 60 } } });
        // Must also restrict to unbacked-only
        expect(filter).toContainEqual({ term: { [RULE_BACKED]: false } });
      });

      it('does not include a range filter when minSeverityScore is omitted', async () => {
        const storageClient = createMockStorageClient();
        storageClient.search.mockResolvedValue({ hits: { hits: [] } });
        const { client } = createQueryClient({ storageClient });

        await client.getPromotableUnbackedQueries();

        const searchArgs = storageClient.search.mock.calls[0][0];
        const filter: unknown[] = searchArgs.query.bool.filter;
        const rangeFilter = filter.find(
          (f) =>
            typeof f === 'object' &&
            f !== null &&
            'range' in f &&
            QUERY_SEVERITY_SCORE in ((f as Record<string, unknown>).range as object)
        );
        expect(rangeFilter).toBeUndefined();
      });

      it('excludes STATS queries via must_not so the set matches the count', async () => {
        const storageClient = createMockStorageClient();
        storageClient.search.mockResolvedValue({ hits: { hits: [] } });
        const { client } = createQueryClient({ storageClient });

        await client.getPromotableUnbackedQueries();

        const searchArgs = storageClient.search.mock.calls[0][0];
        const mustNot: unknown = searchArgs.query.bool.must_not;
        expect(mustNot).toContainEqual({ term: { [QUERY_TYPE]: QUERY_TYPE_STATS } });
      });
    });

    describe('promoteUnbackedQueries orchestration', () => {
      const promotableHit = (overrides: Record<string, unknown>) =>
        toSearchHit(createOldShapeStoredDoc({ [RULE_BACKED]: false, ...overrides }));

      it('promotes every promotable candidate when queryIds is omitted', async () => {
        const storageClient = createMockStorageClient();
        storageClient.search.mockResolvedValue({
          hits: {
            hits: [
              promotableHit({ [STREAM_NAME]: 'logs.a', [ASSET_ID]: 'q1', [ASSET_UUID]: 'u1' }),
              promotableHit({ [STREAM_NAME]: 'logs.a', [ASSET_ID]: 'q2', [ASSET_UUID]: 'u2' }),
            ],
          },
        });
        const { client } = createQueryClient({ storageClient });
        const promoteSpy = jest
          .spyOn(client, 'promoteQueries')
          .mockResolvedValue({ promoted: 2, skipped_stats: 0 });

        const result = await client.promoteUnbackedQueries({
          streamDefinitions: new Map([['logs.a', createMockDefinition('logs.a')]]),
        });

        expect(promoteSpy).toHaveBeenCalledTimes(1);
        expect(promoteSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'logs.a' }), [
          'q1',
          'q2',
        ]);
        expect(result).toEqual({ promoted: 2, skipped_stats: 0 });
      });

      it('groups queries by stream_name and invokes promoteQueries once per stream', async () => {
        const storageClient = createMockStorageClient();
        storageClient.search.mockResolvedValue({
          hits: {
            hits: [
              promotableHit({ [STREAM_NAME]: 'logs.a', [ASSET_ID]: 'q1', [ASSET_UUID]: 'u1' }),
              promotableHit({ [STREAM_NAME]: 'logs.b', [ASSET_ID]: 'q2', [ASSET_UUID]: 'u2' }),
              promotableHit({ [STREAM_NAME]: 'logs.a', [ASSET_ID]: 'q3', [ASSET_UUID]: 'u3' }),
            ],
          },
        });
        const { client } = createQueryClient({ storageClient });
        const promoteSpy = jest
          .spyOn(client, 'promoteQueries')
          .mockResolvedValue({ promoted: 1, skipped_stats: 0 });

        await client.promoteUnbackedQueries({
          streamDefinitions: new Map([
            ['logs.a', createMockDefinition('logs.a')],
            ['logs.b', createMockDefinition('logs.b')],
          ]),
        });

        expect(promoteSpy).toHaveBeenCalledTimes(2);
        expect(promoteSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'logs.a' }), [
          'q1',
          'q3',
        ]);
        expect(promoteSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'logs.b' }), [
          'q2',
        ]);
      });

      it('warns and skips when a stream definition is missing', async () => {
        const storageClient = createMockStorageClient();
        storageClient.search.mockResolvedValue({
          hits: {
            hits: [
              promotableHit({ [STREAM_NAME]: 'logs.a', [ASSET_ID]: 'q1', [ASSET_UUID]: 'u1' }),
              promotableHit({
                [STREAM_NAME]: 'logs.missing',
                [ASSET_ID]: 'q2',
                [ASSET_UUID]: 'u2',
              }),
            ],
          },
        });
        const { client, logger } = createQueryClient({ storageClient });
        const promoteSpy = jest
          .spyOn(client, 'promoteQueries')
          .mockResolvedValue({ promoted: 1, skipped_stats: 0 });

        await client.promoteUnbackedQueries({
          streamDefinitions: new Map([['logs.a', createMockDefinition('logs.a')]]),
        });

        expect(promoteSpy).toHaveBeenCalledTimes(1);
        expect(promoteSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'logs.a' }), [
          'q1',
        ]);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Skipping promotion for missing stream logs.missing')
        );
      });

      it('sums promoted and skipped_stats across streams', async () => {
        const storageClient = createMockStorageClient();
        storageClient.search.mockResolvedValue({
          hits: {
            hits: [
              promotableHit({ [STREAM_NAME]: 'logs.a', [ASSET_ID]: 'q1', [ASSET_UUID]: 'u1' }),
              promotableHit({ [STREAM_NAME]: 'logs.b', [ASSET_ID]: 'q2', [ASSET_UUID]: 'u2' }),
            ],
          },
        });
        const { client } = createQueryClient({ storageClient });
        jest
          .spyOn(client, 'promoteQueries')
          .mockResolvedValueOnce({ promoted: 2, skipped_stats: 0 })
          .mockResolvedValueOnce({ promoted: 3, skipped_stats: 1 });

        const result = await client.promoteUnbackedQueries({
          streamDefinitions: new Map([
            ['logs.a', createMockDefinition('logs.a')],
            ['logs.b', createMockDefinition('logs.b')],
          ]),
        });

        expect(result).toEqual({ promoted: 5, skipped_stats: 1 });
      });

      it('silently drops queryIds that are not in the promotable set', async () => {
        const storageClient = createMockStorageClient();
        storageClient.search.mockResolvedValue({
          hits: {
            hits: [
              promotableHit({ [STREAM_NAME]: 'logs.a', [ASSET_ID]: 'q1', [ASSET_UUID]: 'u1' }),
            ],
          },
        });
        const { client } = createQueryClient({ storageClient });
        const promoteSpy = jest
          .spyOn(client, 'promoteQueries')
          .mockResolvedValue({ promoted: 1, skipped_stats: 0 });

        // q-unknown does not match any candidate (e.g. a STATS id, or an
        // id that no longer exists) — it must be silently filtered out.
        const result = await client.promoteUnbackedQueries({
          queryIds: ['q1', 'q-unknown'],
          streamDefinitions: new Map([['logs.a', createMockDefinition('logs.a')]]),
        });

        expect(promoteSpy).toHaveBeenCalledTimes(1);
        expect(promoteSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'logs.a' }), [
          'q1',
        ]);
        expect(result).toEqual({ promoted: 1, skipped_stats: 0 });
      });

      it('passes minSeverityScore through to getPromotableUnbackedQueries', async () => {
        const storageClient = createMockStorageClient();
        storageClient.search.mockResolvedValue({ hits: { hits: [] } });
        const { client } = createQueryClient({ storageClient });
        jest.spyOn(client, 'promoteQueries').mockResolvedValue({ promoted: 0, skipped_stats: 0 });

        await client.promoteUnbackedQueries({
          minSeverityScore: 70,
          streamDefinitions: new Map(),
        });

        const searchArgs = storageClient.search.mock.calls[0][0];
        const filter: unknown[] = searchArgs.query.bool.filter;
        expect(filter).toContainEqual({ range: { [QUERY_SEVERITY_SCORE]: { gte: 70 } } });
      });
    });

    describe('per-row promote regression — promoteQueries ignores severity', () => {
      it('fetches unbacked queries without a severity range filter', async () => {
        const storageClient = createMockStorageClient();
        // Return one unbacked query for the stream
        storageClient.search.mockResolvedValue({
          hits: {
            hits: [
              toSearchHit(
                createOldShapeStoredDoc({
                  [RULE_BACKED]: false,
                  [QUERY_SEVERITY_SCORE]: 20, // Low severity — should still be promotable per-row
                  [RULE_ID]: 'rule-old-1',
                })
              ),
            ],
          },
        });
        const rulesManagementClient: jest.Mocked<IRulesManagementClient> = {
          createRule: jest.fn().mockResolvedValue(undefined),
          updateRule: jest.fn().mockResolvedValue(undefined),
          bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
        };
        const client = new QueryClient(
          {
            storageClient: storageClient as unknown as IStorageClient<
              QueryStorageSettings,
              StoredQueryLink
            >,
            soClient: {} as SavedObjectsClientContract,
            rulesManagementClient,
            logger: createMockLogger() as unknown as Logger,
          },
          true
        );

        await client.promoteQueries(createMockDefinition(), ['query-old-1']);

        // First search call is for getUnbackedQueries — verify no severity range filter
        const searchArgs = storageClient.search.mock.calls[0][0];
        const filter: unknown[] = searchArgs.query.bool.filter;
        const rangeFilter = filter.find(
          (f) =>
            typeof f === 'object' &&
            f !== null &&
            'range' in f &&
            QUERY_SEVERITY_SCORE in ((f as Record<string, unknown>).range as object)
        );
        expect(rangeFilter).toBeUndefined();
        // Rule creation should proceed for the low-severity query
        expect(rulesManagementClient.createRule).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('findQueries with old-shape documents in keyword mode', () => {
    it('returns clean results for old documents found via keyword search', async () => {
      const storageClient = createMockStorageClient();
      storageClient.search.mockResolvedValue({
        hits: { hits: [toSearchHit(createOldShapeStoredDoc())] },
      });
      const { client } = createQueryClient({ storageClient });

      const results = await client.findQueries(['logs.test'], 'SSH');

      expect(results).toHaveLength(1);
      const topLevelKeys = Object.keys(results[0]);
      expect(topLevelKeys).not.toContain(QUERY_SEARCH_EMBEDDING);
      expect(topLevelKeys).not.toContain(QUERY_KQL_BODY);
      expect(results[0].query.title).toBe('SSH Failed Logins');
    });
  });
});

// ==================== Rule lifecycle (syncQueries / installQueries / uninstallQueries) ====================

describe('rule lifecycle — syncQueries', () => {
  const STREAM = 'logs.test';
  const def = createMockDefinition(STREAM);

  // A simple MATCH ES|QL query with METADATA _id (required for rule-backed queries).
  const MATCH_ESQL = 'FROM logs-* METADATA _id | WHERE http.status >= 500';
  // A STATS ES|QL query — must never produce a rule.
  const STATS_ESQL = 'FROM logs-* | STATS count = COUNT(*) BY service.name';

  // --- local helpers ---

  function rulesManagementClientMock(): jest.Mocked<IRulesManagementClient> {
    return {
      createRule: jest.fn().mockResolvedValue(undefined),
      updateRule: jest.fn().mockResolvedValue(undefined),
      bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
    };
  }

  /** Build a QueryClient with a fully-wired IRulesManagementClient mock. */
  function makeClient(
    rc: jest.Mocked<IRulesManagementClient>,
    sc = createMockStorageClient(),
    sigEventsEnabled = true
  ) {
    return {
      client: new QueryClient(
        {
          storageClient: sc as unknown as IStorageClient<QueryStorageSettings, StoredQueryLink>,
          soClient: {} as SavedObjectsClientContract,
          rulesManagementClient: rc,
          logger: createMockLogger() as unknown as Logger,
        },
        sigEventsEnabled,
        false
      ),
      storageClient: sc,
      rc,
    };
  }

  function matchQuery(id = 'q1', esql = MATCH_ESQL): StreamQuery {
    return {
      id,
      type: 'match',
      title: `Query ${id}`,
      description: '',
      esql: { query: esql },
    };
  }

  /** Deterministic rule ID matching QueryClient's own computation for a given stream+query. */
  function ruleIdFor(queryId: string, esql: string): string {
    const uuid = getQueryLinkUuid(STREAM, { 'asset.type': 'query', 'asset.id': queryId });
    return computeRuleId(uuid, esql);
  }

  /**
   * Builds the stored-doc shape that `fromStorage` would read for an existing rule-backed query.
   * STREAM_NAME is inherited from `createOldShapeStoredDoc`'s default ('logs.test').
   */
  function existingStoredDoc(
    queryId: string,
    esql: string,
    opts: { ruleBacked?: boolean } = {}
  ): Record<string, unknown> {
    const uuid = getQueryLinkUuid(STREAM, { 'asset.type': 'query', 'asset.id': queryId });
    return createOldShapeStoredDoc({
      [ASSET_ID]: queryId,
      [ASSET_UUID]: uuid,
      [QUERY_ESQL_QUERY]: esql,
      [QUERY_TITLE]: `Query ${queryId}`,
      [RULE_BACKED]: opts.ruleBacked ?? true,
      [RULE_ID]: computeRuleId(uuid, esql),
    });
  }

  // --- tests ---

  describe('new query', () => {
    it('calls rulesClient.createRule once for a brand-new rule-backed query', async () => {
      const rc = rulesManagementClientMock();
      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({ hits: { hits: [] } });
      const { client } = makeClient(rc, sc);

      await client.syncQueries(def, [matchQuery()]);

      expect(rc.createRule).toHaveBeenCalledTimes(1);
      expect(rc.updateRule).not.toHaveBeenCalled();
      expect(rc.bulkDeleteRules).not.toHaveBeenCalled();
    });

    it('passes the correct rule body when creating', async () => {
      const rc = rulesManagementClientMock();
      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({ hits: { hits: [] } });
      const { client } = makeClient(rc, sc);

      await client.syncQueries(def, [matchQuery('q1', MATCH_ESQL)]);

      const expectedRuleId = ruleIdFor('q1', MATCH_ESQL);
      expect(rc.createRule).toHaveBeenCalledWith(expectedRuleId, {
        name: 'Query q1',
        consumer: 'streams',
        alertTypeId: 'streams.rules.esql',
        actions: [],
        params: { timestampField: '@timestamp', query: MATCH_ESQL },
        enabled: true,
        tags: ['streams', STREAM],
        schedule: { interval: '1m' },
      });
    });
  });

  describe('non-breaking update (title/description changed, ES|QL unchanged)', () => {
    it('calls rulesClient.updateRule and does not create or delete', async () => {
      const rc = rulesManagementClientMock();
      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({
        hits: { hits: [toSearchHit(existingStoredDoc('q1', MATCH_ESQL))] },
      });
      const { client } = makeClient(rc, sc);

      const updated = { ...matchQuery('q1', MATCH_ESQL), title: 'Updated Title' };
      await client.syncQueries(def, [updated]);

      expect(rc.updateRule).toHaveBeenCalledTimes(1);
      expect(rc.createRule).not.toHaveBeenCalled();
      expect(rc.bulkDeleteRules).not.toHaveBeenCalled();
    });

    it('passes the correct update body', async () => {
      const rc = rulesManagementClientMock();
      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({
        hits: { hits: [toSearchHit(existingStoredDoc('q1', MATCH_ESQL))] },
      });
      const { client } = makeClient(rc, sc);

      const updated = { ...matchQuery('q1', MATCH_ESQL), title: 'Updated Title' };
      await client.syncQueries(def, [updated]);

      const expectedRuleId = ruleIdFor('q1', MATCH_ESQL);
      expect(rc.updateRule).toHaveBeenCalledWith(expectedRuleId, {
        name: 'Updated Title',
        actions: [],
        params: { timestampField: '@timestamp', query: MATCH_ESQL },
        tags: ['streams', STREAM],
        schedule: { interval: '1m' },
      });
    });
  });

  describe('breaking change (ES|QL changed)', () => {
    it('deletes the old rule and creates a new one with a new rule ID', async () => {
      const rc = rulesManagementClientMock();
      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({
        hits: { hits: [toSearchHit(existingStoredDoc('q1', MATCH_ESQL))] },
      });
      const { client } = makeClient(rc, sc);

      const newEsql = 'FROM logs-* METADATA _id | WHERE http.status >= 503';
      await client.syncQueries(def, [{ ...matchQuery('q1'), esql: { query: newEsql } }]);

      const oldRuleId = ruleIdFor('q1', MATCH_ESQL);
      const newRuleId = ruleIdFor('q1', newEsql);

      expect(rc.bulkDeleteRules).toHaveBeenCalledWith([oldRuleId]);
      expect(rc.createRule).toHaveBeenCalledWith(
        newRuleId,
        expect.objectContaining({ params: { timestampField: '@timestamp', query: newEsql } })
      );
      expect(rc.updateRule).not.toHaveBeenCalled();
    });

    it('treats whitespace-only ES|QL changes as non-breaking (no rule churn)', async () => {
      const rc = rulesManagementClientMock();
      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({
        hits: { hits: [toSearchHit(existingStoredDoc('q1', MATCH_ESQL))] },
      });
      const { client } = makeClient(rc, sc);

      const reformatted = '  FROM  logs-*   METADATA   _id  |  WHERE  http.status  >=  500  ';
      await client.syncQueries(def, [{ ...matchQuery('q1'), esql: { query: reformatted } }]);

      expect(rc.updateRule).toHaveBeenCalledTimes(1);
      expect(rc.createRule).not.toHaveBeenCalled();
      expect(rc.bulkDeleteRules).not.toHaveBeenCalled();
    });
  });

  describe('removed query', () => {
    it('calls bulkDeleteRules when a rule-backed query is no longer in the input list', async () => {
      const rc = rulesManagementClientMock();
      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({
        hits: { hits: [toSearchHit(existingStoredDoc('q1', MATCH_ESQL))] },
      });
      const { client } = makeClient(rc, sc);

      await client.syncQueries(def, []); // empty → delete all

      const expectedRuleId = ruleIdFor('q1', MATCH_ESQL);
      expect(rc.bulkDeleteRules).toHaveBeenCalledWith([expectedRuleId]);
      expect(rc.createRule).not.toHaveBeenCalled();
    });

    it('does not call bulkDeleteRules for an unbacked query that is removed', async () => {
      const rc = rulesManagementClientMock();
      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({
        hits: {
          hits: [toSearchHit(existingStoredDoc('q1', MATCH_ESQL, { ruleBacked: false }))],
        },
      });
      const { client } = makeClient(rc, sc);

      await client.syncQueries(def, []); // remove the unbacked query

      expect(rc.bulkDeleteRules).not.toHaveBeenCalled();
    });
  });

  describe('STATS query', () => {
    it('does not create a rule for a new STATS query', async () => {
      const rc = rulesManagementClientMock();
      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({ hits: { hits: [] } });
      const { client } = makeClient(rc, sc);

      const statsQuery: StreamQuery = {
        id: 'q-stats',
        type: 'stats',
        title: 'Stats Query',
        description: '',
        esql: { query: STATS_ESQL },
      };
      await client.syncQueries(def, [statsQuery]);

      expect(rc.createRule).not.toHaveBeenCalled();
      expect(rc.updateRule).not.toHaveBeenCalled();
      expect(rc.bulkDeleteRules).not.toHaveBeenCalled();
    });

    it('deletes the rule when a previously rule-backed query becomes STATS', async () => {
      const rc = rulesManagementClientMock();
      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({
        hits: { hits: [toSearchHit(existingStoredDoc('q1', MATCH_ESQL))] },
      });
      const { client } = makeClient(rc, sc);

      const demotedQuery: StreamQuery = {
        id: 'q1',
        type: 'stats',
        title: 'Query q1',
        description: '',
        esql: { query: STATS_ESQL },
      };
      await client.syncQueries(def, [demotedQuery]);

      const expectedRuleId = ruleIdFor('q1', MATCH_ESQL);
      expect(rc.bulkDeleteRules).toHaveBeenCalledWith([expectedRuleId]);
      expect(rc.createRule).not.toHaveBeenCalled();
    });
  });

  describe('feature flag disabled', () => {
    it('is a no-op when significant events is disabled', async () => {
      const rc = rulesManagementClientMock();
      const sc = createMockStorageClient();
      const { client } = makeClient(rc, sc, false /* sigEventsEnabled = false */);

      await client.syncQueries(def, [matchQuery()]);

      expect(rc.createRule).not.toHaveBeenCalled();
      expect(rc.updateRule).not.toHaveBeenCalled();
      expect(rc.bulkDeleteRules).not.toHaveBeenCalled();
      expect(sc.search).not.toHaveBeenCalled();
      expect(sc.bulk).not.toHaveBeenCalled();
    });
  });

  describe('compensation on install failure', () => {
    it('calls bulkDeleteRules for all queued creates when installQueries partially fails', async () => {
      const rc = rulesManagementClientMock();
      // First createRule succeeds; second rejects.
      rc.createRule
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('server error'));

      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({ hits: { hits: [] } });
      const { client } = makeClient(rc, sc);

      const esql1 = 'FROM logs-* METADATA _id | WHERE http.status == 500';
      const esql2 = 'FROM logs-* METADATA _id | WHERE http.status == 503';

      await expect(
        client.syncQueries(def, [matchQuery('q1', esql1), matchQuery('q2', esql2)])
      ).rejects.toThrow('server error');

      const ruleId1 = ruleIdFor('q1', esql1);
      const ruleId2 = ruleIdFor('q2', esql2);

      expect(rc.bulkDeleteRules).toHaveBeenCalledWith(
        expect.arrayContaining([ruleId1, ruleId2])
      );
    });

    it('does not call bulkDeleteRules for update-only queries when install fails', async () => {
      const rc = rulesManagementClientMock();
      rc.updateRule.mockRejectedValue(new Error('update failed'));

      const sc = createMockStorageClient();
      sc.search.mockResolvedValue({
        hits: { hits: [toSearchHit(existingStoredDoc('q1', MATCH_ESQL))] },
      });
      const { client } = makeClient(rc, sc);

      await expect(client.syncQueries(def, [matchQuery('q1', MATCH_ESQL)])).rejects.toThrow(
        'update failed'
      );

      expect(rc.bulkDeleteRules).not.toHaveBeenCalled();
    });
  });
});
