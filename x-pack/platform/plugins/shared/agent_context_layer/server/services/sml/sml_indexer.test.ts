/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { createSmlIndexer } from './sml_indexer';
import { createSmlStorage, smlIndexName } from './sml_storage';
import type {
  SmlChunk,
  SmlIndexerContentParams,
  SmlIndexerOriginParams,
  SmlTypeDefinition,
} from './types';

jest.mock('./sml_storage', () => ({
  smlIndexName: '.test-sml-data',
  createSmlStorage: jest.fn().mockReturnValue({
    getClient: jest.fn().mockReturnValue({
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    }),
  }),
}));

jest.mock('./sml_service', () => ({
  isNotFoundError: jest.fn(
    (error: unknown) => (error as { statusCode?: number })?.statusCode === 404
  ),
}));

// Distinct mock id per call so tests can assert each bulk operation gets its
// own _id. Reset in `beforeEach` so cross-test counts stay stable.
let mockUuidCounter = 0;
jest.mock('uuid', () => ({ v4: () => `mock-uuid-${++mockUuidCounter}` }));

const createMockEsClient = (): jest.Mocked<ElasticsearchClient> =>
  ({
    deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
  } as unknown as jest.Mocked<ElasticsearchClient>);

const createMockLogger = () => {
  const log = loggerMock.create();
  log.get = jest.fn().mockReturnValue(log);
  return log;
};

const createMockSmlTypeDefinition = (
  overrides: Partial<SmlTypeDefinition> = {}
): SmlTypeDefinition => ({
  id: 'test-type',
  list: jest.fn(),
  getSmlData: jest.fn(),
  toAttachment: jest.fn(),
  ...overrides,
});

const createMockRegistry = (definition?: SmlTypeDefinition) => ({
  get: jest.fn().mockReturnValue(definition),
  list: jest.fn().mockReturnValue(definition ? [definition] : []),
  register: jest.fn(),
  has: jest.fn().mockReturnValue(!!definition),
});

const createIndexerParams = (
  overrides: {
    originId?: string;
    attachmentType?: string;
    spaces?: string[];
    esClient?: jest.Mocked<ElasticsearchClient>;
    logger?: ReturnType<typeof createMockLogger>;
    action?: 'create' | 'update' | 'delete';
  } = {}
): SmlIndexerOriginParams => ({
  originId: overrides.originId ?? 'att-123',
  attachmentType: overrides.attachmentType ?? 'lens',
  spaces: overrides.spaces ?? ['default'],
  esClient: overrides.esClient ?? createMockEsClient(),
  savedObjectsClient: {} as unknown as ISavedObjectsRepository,
  logger: overrides.logger ?? createMockLogger(),
  action: overrides.action ?? 'create',
});

// Content-mode params can't be derived from `createIndexerParams` via spread
// because the origin-mode return type carries `force?: boolean`, which conflicts
// with content mode's `force?: undefined`. Build content params directly.
const createContentIndexerParams = (overrides: {
  originId?: string;
  attachmentType?: string;
  spaces?: string[];
  esClient?: jest.Mocked<ElasticsearchClient>;
  logger?: ReturnType<typeof createMockLogger>;
  action?: 'create' | 'update' | 'delete';
  content: SmlChunk[];
}): SmlIndexerContentParams => ({
  originId: overrides.originId ?? 'att-123',
  attachmentType: overrides.attachmentType ?? 'lens',
  spaces: overrides.spaces ?? ['default'],
  esClient: overrides.esClient ?? createMockEsClient(),
  savedObjectsClient: {} as unknown as ISavedObjectsRepository,
  logger: overrides.logger ?? createMockLogger(),
  action: overrides.action ?? 'create',
  content: overrides.content,
});

describe('createSmlIndexer', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
  });

  describe('indexAttachment', () => {
    it('delete action: calls deleteByQuery and does NOT call getSmlData', async () => {
      const getSmlData = jest.fn();
      const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens', getSmlData }));
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.indexAttachment(
        createIndexerParams({
          originId: 'att-1',
          attachmentType: 'lens',
          action: 'delete',
          esClient,
          logger,
        })
      );

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.deleteByQuery).toHaveBeenCalledWith({
        index: smlIndexName,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: {
          bool: {
            filter: [{ term: { 'origin.uri': 'lens://att-1' } }, { term: { ingestion_method: 'crawled' } }],
          },
        },
        refresh: false,
      });
      expect(getSmlData).not.toHaveBeenCalled();
    });

    it('create action: calls getSmlData, deletes existing chunks, bulk indexes new ones', async () => {
      const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
      const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
      (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

      const smlData = {
        chunks: [{ type: 'lens', title: 'My Viz', content: 'content', permissions: ['perm1'] }],
      };
      const getSmlData = jest.fn().mockResolvedValue(smlData);
      const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens', getSmlData }));
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const contextLogger = createMockLogger();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.indexAttachment(
        createIndexerParams({
          originId: 'att-2',
          attachmentType: 'lens',
          action: 'create',
          spaces: ['default', 'space-2'],
          esClient,
          logger: contextLogger,
        })
      );

      expect(getSmlData).toHaveBeenCalledTimes(1);
      expect(getSmlData).toHaveBeenCalledWith('att-2', {
        esClient,
        savedObjectsClient: {},
        logger: contextLogger,
      });
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.deleteByQuery).toHaveBeenCalledWith({
        index: smlIndexName,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: { bool: { filter: [{ term: { 'origin.uri': 'lens://att-2' } }] } },
        refresh: false,
      });
      expect(bulkMock).toHaveBeenCalledTimes(1);
      const bulkCall = bulkMock.mock.calls[0][0];
      expect(bulkCall.refresh).toBe('wait_for');
      expect(bulkCall.operations).toHaveLength(1);
      // _id is a bare UUID (no `${type}:${origin}:...` prefix) so it cannot
      // overflow ES's 512-byte _id limit no matter how long caller-supplied
      // inputs are. Document carries `origin_id`/`type` as searchable fields.
      expect(bulkCall.operations[0].index._id).toBe('mock-uuid-1');
      expect(bulkCall.operations[0].index.document).toEqual({
        id: 'mock-uuid-1',
        type: 'lens',
        title: 'My Viz',
        origin: { uri: 'lens://att-2' },
        content: 'content',
        created_at: expect.any(String),
        updated_at: expect.any(String),
        spaces: ['default', 'space-2'],
        permissions: ['perm1'],
        ingestion_method: 'crawled',
        discovery_labels: [
          { value: 'My Viz', kind: 'title' },
          { value: 'lens', kind: 'type' },
        ],
      });
    });

    it('create action: round-trips all new schema fields (tags, discovery_labels, extended_attrs, references, description, user_id)', async () => {
      const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
      const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
      (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

      const smlData = {
        chunks: [
          {
            type: 'dashboard',
            title: 'Sales Q3',
            content: 'sales dashboard for Q3 with revenue and conversion metrics',
            description: 'Quarterly sales overview, executive audience',
            tags: ['sales', 'executive', 'quarterly'],
            discovery_labels: [
              { value: 'q3 sales', kind: 'tagline' },
              { value: 'sales q3 dashboard', kind: 'nickname' },
            ],
            extended_attrs: {
              owner_team: 'sales-ops',
              fields: [{ name: 'revenue', type: 'currency' }],
            },
            user_id: 'user-7',
            references: [{ uri: 'category://sales' }, { uri: 'dashboard://parent-1' }],
            permissions: ['saved_object:dashboard/get'],
          },
        ],
      };
      const getSmlData = jest.fn().mockResolvedValue(smlData);
      const registry = createMockRegistry(
        createMockSmlTypeDefinition({ id: 'dashboard', getSmlData })
      );
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.indexAttachment(
        createIndexerParams({
          originId: 'dash-100',
          attachmentType: 'dashboard',
          action: 'create',
          spaces: ['default'],
          esClient,
        })
      );

      expect(bulkMock).toHaveBeenCalledTimes(1);
      const bulkCall = bulkMock.mock.calls[0][0];
      expect(bulkCall.operations[0].index.document).toEqual({
        id: 'dashboard:dash-100:mock-uuid',
        type: 'dashboard',
        title: 'Sales Q3',
        origin: { uri: 'dashboard://dash-100' },
        content: 'sales dashboard for Q3 with revenue and conversion metrics',
        description: 'Quarterly sales overview, executive audience',
        tags: ['sales', 'executive', 'quarterly'],
        discovery_labels: [
          { value: 'Sales Q3', kind: 'title' },
          { value: 'dashboard', kind: 'type' },
          { value: 'q3 sales', kind: 'tagline' },
          { value: 'sales q3 dashboard', kind: 'nickname' },
        ],
        extended_attrs: {
          owner_team: 'sales-ops',
          fields: [{ name: 'revenue', type: 'currency' }],
        },
        user_id: 'user-7',
        references: [{ uri: 'category://sales' }, { uri: 'dashboard://parent-1' }],
        created_at: expect.any(String),
        updated_at: expect.any(String),
        spaces: ['default'],
        permissions: ['saved_object:dashboard/get'],
        ingestion_method: 'crawled',
      });
    });

    it('update action: same as create (delete-then-write)', async () => {
      const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
      const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
      (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

      const smlData = {
        chunks: [{ type: 'lens', title: 'Updated', content: 'new content' }],
      };
      const getSmlData = jest.fn().mockResolvedValue(smlData);
      const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens', getSmlData }));
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.indexAttachment(
        createIndexerParams({
          originId: 'att-3',
          attachmentType: 'lens',
          action: 'update',
          esClient,
        })
      );

      expect(getSmlData).toHaveBeenCalledTimes(1);
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(bulkMock).toHaveBeenCalledTimes(1);
    });

    it('unknown type: logs warning and returns without action', async () => {
      const registry = createMockRegistry(undefined);
      registry.list.mockReturnValue([]);
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.indexAttachment(
        createIndexerParams({
          originId: 'att-4',
          attachmentType: 'unknown-type',
          action: 'create',
          esClient,
          logger,
        })
      );

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("type definition 'unknown-type' not found")
      );
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('getSmlData returns undefined: deletes existing chunks and does not index', async () => {
      const bulkMock = jest.fn();
      const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
      (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

      const getSmlData = jest.fn().mockResolvedValue(undefined);
      const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens', getSmlData }));
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.indexAttachment(
        createIndexerParams({
          originId: 'att-5',
          attachmentType: 'lens',
          action: 'create',
          esClient,
        })
      );

      expect(getSmlData).toHaveBeenCalledTimes(1);
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(bulkMock).not.toHaveBeenCalled();
    });

    it('getSmlData returns empty chunks: deletes existing chunks and does not index', async () => {
      const bulkMock = jest.fn();
      const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
      (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

      const getSmlData = jest.fn().mockResolvedValue({ chunks: [] });
      const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens', getSmlData }));
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.indexAttachment(
        createIndexerParams({
          originId: 'att-6',
          attachmentType: 'lens',
          action: 'create',
          esClient,
        })
      );

      expect(getSmlData).toHaveBeenCalledTimes(1);
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(bulkMock).not.toHaveBeenCalled();
    });

    it('deleteChunks handles 404 gracefully', async () => {
      const error404 = Object.assign(new Error('index_not_found_exception'), {
        statusCode: 404,
      });
      const esClient = createMockEsClient();
      esClient.deleteByQuery.mockRejectedValue(error404);

      const registry = createMockRegistry(
        createMockSmlTypeDefinition({ id: 'lens', getSmlData: jest.fn() })
      );
      const logger = createMockLogger();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.indexAttachment(
        createIndexerParams({
          originId: 'att-7',
          attachmentType: 'lens',
          action: 'delete',
          esClient,
          logger,
        })
      );

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('deleteChunks warns on non-404 errors', async () => {
      const error500 = Object.assign(new Error('internal error'), { statusCode: 500 });
      const esClient = createMockEsClient();
      esClient.deleteByQuery.mockRejectedValue(error500);

      const registry = createMockRegistry(
        createMockSmlTypeDefinition({ id: 'lens', getSmlData: jest.fn() })
      );
      const logger = createMockLogger();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.indexAttachment(
        createIndexerParams({
          originId: 'att-8',
          attachmentType: 'lens',
          action: 'delete',
          esClient,
          logger,
        })
      );

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failed to delete crawled chunks'));
    });

    it('bulk index errors are logged', async () => {
      const bulkMock = jest.fn().mockResolvedValue({
        errors: true,
        items: [{ index: { error: { type: 'mapper_parsing_exception', reason: 'failed' } } }],
      });
      const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
      (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

      const smlData = {
        chunks: [{ type: 'lens', title: 'T', content: 'c' }],
      };
      const getSmlData = jest.fn().mockResolvedValue(smlData);
      const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens', getSmlData }));
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.indexAttachment(
        createIndexerParams({
          originId: 'att-9',
          attachmentType: 'lens',
          action: 'create',
          esClient,
          logger,
        })
      );

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('bulk index errors'));
    });

    it('bulk index throws on failure', async () => {
      const bulkMock = jest.fn().mockRejectedValue(new Error('Connection refused'));
      const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
      (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

      const smlData = {
        chunks: [{ type: 'lens', title: 'T', content: 'c' }],
      };
      const getSmlData = jest.fn().mockResolvedValue(smlData);
      const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens', getSmlData }));
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await expect(
        indexer.indexAttachment(
          createIndexerParams({
            originId: 'att-10',
            attachmentType: 'lens',
            action: 'create',
            esClient,
            logger,
          })
        )
      ).rejects.toThrow('Connection refused');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed to index SML data')
      );
    });

    it('permissions default to empty array when not provided', async () => {
      const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
      const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
      (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

      const smlData = {
        chunks: [{ type: 'lens', title: 'No Perms', content: 'c' }],
      };
      const getSmlData = jest.fn().mockResolvedValue(smlData);
      const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens', getSmlData }));
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.indexAttachment(
        createIndexerParams({
          originId: 'att-11',
          attachmentType: 'lens',
          action: 'create',
          esClient,
        })
      );

      const bulkCall = bulkMock.mock.calls[0][0];
      expect(bulkCall.operations[0].index.document.permissions).toEqual([]);
    });

    describe('manual-entry protection (origin mode)', () => {
      it('skips getSmlData and write when a manual entry already exists', async () => {
        const bulkMock = jest.fn();
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const getSmlData = jest.fn();
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        // hasManualEntry returns true
        (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createIndexerParams({
            originId: 'att-protected',
            attachmentType: 'lens',
            action: 'create',
            esClient,
            logger,
          })
        );

        expect(esClient.count).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                filter: expect.arrayContaining([
                  { term: { origin_id: 'att-protected' } },
                  { term: { ingestion_method: 'manual' } },
                ]),
              }),
            }),
          })
        );
        expect(getSmlData).not.toHaveBeenCalled();
        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
        expect(bulkMock).not.toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(
          expect.stringContaining("skipping origin-mode index for 'att-protected'")
        );
      });

      it('force=true overrides existing manual entry and writes as crawled', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const smlData = {
          chunks: [{ type: 'lens', title: 'Forced', content: 'c' }],
        };
        const getSmlData = jest.fn().mockResolvedValue(smlData);
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment({
          ...createIndexerParams({
            originId: 'att-forced',
            attachmentType: 'lens',
            action: 'create',
            esClient,
          }),
          force: true,
        });

        // hasManualEntry is bypassed entirely when force=true
        expect(esClient.count).not.toHaveBeenCalled();
        expect(getSmlData).toHaveBeenCalledTimes(1);
        expect(bulkMock).toHaveBeenCalledTimes(1);
        expect(bulkMock.mock.calls[0][0].operations[0].index.document.ingestion_method).toBe(
          'crawled'
        );
      });

      it('delete action proceeds regardless of manual entries', async () => {
        const getSmlData = jest.fn();
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createIndexerParams({
            originId: 'att-delete-protected',
            attachmentType: 'lens',
            action: 'delete',
            esClient,
          })
        );

        expect(esClient.count).not.toHaveBeenCalled();
        expect(getSmlData).not.toHaveBeenCalled();
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      });

      it('hasManualEntry treats lookup errors as no manual entry', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const smlData = {
          chunks: [{ type: 'lens', title: 'T', content: 'c' }],
        };
        const getSmlData = jest.fn().mockResolvedValue(smlData);
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        (esClient.count as jest.Mock).mockRejectedValue(
          Object.assign(new Error('boom'), { statusCode: 500 })
        );
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createIndexerParams({
            originId: 'att-flaky',
            attachmentType: 'lens',
            action: 'create',
            esClient,
            logger,
          })
        );

        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('hasManualEntry check failed')
        );
        // Should proceed (fail-open) and call getSmlData + bulk
        expect(getSmlData).toHaveBeenCalledTimes(1);
        expect(bulkMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('content mode (manual)', () => {
      it('writes provided chunks with unique bare-UUID ids and ingestion_method=manual', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const getSmlData = jest.fn();
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createContentIndexerParams({
            originId: 'att-manual',
            attachmentType: 'lens',
            action: 'create',
            spaces: ['default'],
            esClient,
            content: [
              { type: 'lens', title: 'First', content: 'one', permissions: ['p1'] },
              { type: 'lens', title: 'Second', content: 'two' },
            ],
          })
        );

        // getSmlData must NOT be called in content mode
        expect(getSmlData).not.toHaveBeenCalled();
        // Manual-protection check is also skipped in content mode
        expect(esClient.count).not.toHaveBeenCalled();
        // Existing chunks for this origin_id are still removed before write
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);

        expect(bulkMock).toHaveBeenCalledTimes(1);
        const ops = bulkMock.mock.calls[0][0].operations;
        expect(ops).toHaveLength(2);
        // Each chunk gets its own UUID (no `${type}:${origin}:manual:${index}`
        // construction). Idempotency on repeat calls comes from the
        // unconditional `deleteByQuery` for this `origin_id` above, not from
        // deterministic ids.
        expect(ops[0].index._id).toBe('mock-uuid-1');
        expect(ops[1].index._id).toBe('mock-uuid-2');
        expect(ops[0].index._id).not.toBe(ops[1].index._id);
        expect(ops[0].index.document).toEqual(
          expect.objectContaining({
            id: 'mock-uuid-1',
            title: 'First',
            origin_id: 'att-manual',
            content: 'one',
            permissions: ['p1'],
            ingestion_method: 'manual',
          })
        );
        expect(ops[1].index.document.id).toBe('mock-uuid-2');
        expect(ops[1].index.document.ingestion_method).toBe('manual');
        expect(ops[1].index.document.permissions).toEqual([]);
      });

      it('content mode does not require a registered type definition', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const registry = createMockRegistry(undefined);
        registry.list.mockReturnValue([]);
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createContentIndexerParams({
            originId: 'att-no-type',
            attachmentType: 'unregistered',
            action: 'create',
            esClient,
            logger,
            content: [{ type: 'unregistered', title: 'T', content: 'c' }],
          })
        );

        expect(logger.warn).not.toHaveBeenCalled();
        expect(bulkMock).toHaveBeenCalledTimes(1);
      });

      it('content mode with empty chunks deletes existing and writes nothing', async () => {
        const bulkMock = jest.fn();
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens' }));
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createContentIndexerParams({
            originId: 'att-empty-manual',
            attachmentType: 'lens',
            action: 'create',
            esClient,
            content: [],
          })
        );

        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
        expect(bulkMock).not.toHaveBeenCalled();
      });

      it('delete action removes only crawled chunks (manual entries preserved)', async () => {
        // `indexAttachment({ action: 'delete' })` is a back-compat shape used
        // by the crawler and event-driven CRUD callers; it always defaults to
        // wiping `'crawled'` chunks. Callers that need to wipe `'manual'` or
        // `'all'` chunks use `deleteAttachment` (covered in its own block).
        const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens' }));
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createContentIndexerParams({
            originId: 'att-delete-with-content',
            attachmentType: 'lens',
            action: 'delete',
            esClient,
            // `content` is ignored in delete mode — the early `action === 'delete'`
            // check fires before the content-mode branch.
            content: [{ type: 'lens', title: 'ignored', content: 'ignored' }],
          })
        );

        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
        const callArgs = (esClient.deleteByQuery as jest.Mock).mock.calls[0][0];
        expect(callArgs.query.bool.filter).toEqual([
          { term: { origin_id: 'att-delete-with-content' } },
          { term: { ingestion_method: 'crawled' } },
        ]);
      });
    });
  });

  describe('deleteAttachment', () => {
    const createDeleteParams = (
      overrides: {
        originId?: string;
        attachmentType?: string;
        spaces?: string[];
        esClient?: jest.Mocked<ElasticsearchClient>;
        logger?: ReturnType<typeof createMockLogger>;
        ingestionMethod?: 'crawled' | 'manual' | 'all';
      } = {}
    ) => ({
      originId: overrides.originId ?? 'att-123',
      attachmentType: overrides.attachmentType ?? 'lens',
      spaces: overrides.spaces ?? ['default'],
      esClient: overrides.esClient ?? createMockEsClient(),
      savedObjectsClient: {} as unknown as ISavedObjectsRepository,
      logger: overrides.logger ?? createMockLogger(),
      ...(overrides.ingestionMethod !== undefined
        ? { ingestionMethod: overrides.ingestionMethod }
        : {}),
    });

    it('omits ingestion_method filter when ingestionMethod is "all" (wipes every chunk for the origin)', async () => {
      const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens' }));
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.deleteAttachment(
        createDeleteParams({ originId: 'att-wipe-all', ingestionMethod: 'all', esClient })
      );

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      const callArgs = (esClient.deleteByQuery as jest.Mock).mock.calls[0][0];
      // Filter must contain ONLY the origin_id term — no ingestion_method
      // term means deleteByQuery removes manual + crawled.
      expect(callArgs.query.bool.filter).toEqual([{ term: { origin_id: 'att-wipe-all' } }]);
    });

    it('filters on ingestion_method=manual when ingestionMethod is "manual"', async () => {
      const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens' }));
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await indexer.deleteAttachment(
        createDeleteParams({ originId: 'att-wipe-manual', ingestionMethod: 'manual', esClient })
      );

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      const callArgs = (esClient.deleteByQuery as jest.Mock).mock.calls[0][0];
      expect(callArgs.query.bool.filter).toEqual([
        { term: { origin_id: 'att-wipe-manual' } },
        { term: { ingestion_method: 'manual' } },
      ]);
    });

    it('defaults to ingestionMethod="crawled" when omitted (back-compat with crawler/connector lifecycle callers)', async () => {
      const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens' }));
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      // No `ingestionMethod` passed — should behave exactly like the historical
      // `action: 'delete'` call on `indexAttachment` (preserve manual entries,
      // wipe crawled).
      await indexer.deleteAttachment(
        createDeleteParams({ originId: 'att-default-scope', esClient })
      );

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      const callArgs = (esClient.deleteByQuery as jest.Mock).mock.calls[0][0];
      expect(callArgs.query.bool.filter).toEqual([
        { term: { origin_id: 'att-default-scope' } },
        { term: { ingestion_method: 'crawled' } },
      ]);
    });
  });
});
