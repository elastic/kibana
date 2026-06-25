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
import { SmlUnregisteredTypeError } from './sml_errors';
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
    count: jest.fn().mockResolvedValue({ count: 0 }),
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
            filter: [
              { term: { 'origin.uri': 'lens://att-1' } },
              { term: { ingestion_method: 'crawled' } },
            ],
          },
        },
        refresh: false,
      });
      expect(getSmlData).not.toHaveBeenCalled();
    });

    it('create action: calls getSmlData, deletes existing chunks, bulk indexes new ones with permissions from getPermissions hook', async () => {
      const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
      const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
      (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

      const smlData = {
        chunks: [
          {
            type: 'lens',
            title: 'My Viz',
            content: 'content',
          },
        ],
      };
      const getSmlData = jest.fn().mockResolvedValue(smlData);
      const getPermissions = jest.fn().mockReturnValue({
        kibana: { privileges: [{ name: 'perm1' }] },
        elasticsearch: { indices: [] },
      });
      const registry = createMockRegistry(
        createMockSmlTypeDefinition({ id: 'lens', getSmlData, getPermissions })
      );
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
      expect(getPermissions).toHaveBeenCalledWith('att-2', {
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
        permissions: {
          kibana: { privileges: [{ name: 'perm1' }] },
          elasticsearch: { indices: [] },
        },
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
          },
        ],
      };
      const getSmlData = jest.fn().mockResolvedValue(smlData);
      const getPermissions = jest.fn().mockReturnValue({
        kibana: { privileges: [{ name: 'saved_object:dashboard/get' }] },
        elasticsearch: { indices: [] },
      });
      const registry = createMockRegistry(
        createMockSmlTypeDefinition({ id: 'dashboard', getSmlData, getPermissions })
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
        id: 'mock-uuid-1',
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
        permissions: {
          kibana: { privileges: [{ name: 'saved_object:dashboard/get' }] },
          elasticsearch: { indices: [] },
        },
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

    it('unknown type in origin mode: throws SmlUnregisteredTypeError without touching ES', async () => {
      const registry = createMockRegistry(undefined);
      registry.list.mockReturnValue([]);
      const logger = createMockLogger();
      const esClient = createMockEsClient();
      const indexer = createSmlIndexer({ registry, logger });

      await expect(
        indexer.indexAttachment(
          createIndexerParams({
            originId: 'att-4',
            attachmentType: 'unknown-type',
            action: 'create',
            esClient,
            logger,
          })
        )
      ).rejects.toBeInstanceOf(SmlUnregisteredTypeError);
      // Origin-mode writes must surface the type-registration failure
      // *before* touching ES so the data plane and the registry can't
      // silently drift.
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
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to delete crawled chunks')
      );
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
                  { term: { 'origin.uri': 'lens://att-protected' } },
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
      it('writes provided chunks with unique bare-UUID ids and stamps permissions from getPermissions', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const getSmlData = jest.fn();
        // Content-mode writes must inherit the same permission gating as
        // origin-mode — `getPermissions` is the single source of truth.
        const getPermissions = jest.fn().mockReturnValue({
          kibana: { privileges: [{ name: 'saved_object:lens/get' }] },
          elasticsearch: { indices: [] },
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData, getPermissions })
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
              { type: 'lens', title: 'First', content: 'one' },
              { type: 'lens', title: 'Second', content: 'two' },
            ],
          })
        );

        expect(getSmlData).not.toHaveBeenCalled();
        // getPermissions is called exactly once per `indexAttachment`
        // call — its result only depends on `originId` (not on the chunk),
        // so calling it per chunk would be wasted work and would also
        // make fail-closed atomicity hard to reason about (a per-chunk
        // throw on chunk N would leave the origin half-written). The
        // workflow step still cannot bypass the type's gating by
        // writing in content mode: the one call applies to every chunk
        // produced in the batch.
        expect(getPermissions).toHaveBeenCalledTimes(1);
        expect(getPermissions).toHaveBeenCalledWith(
          'att-manual',
          expect.objectContaining({ esClient })
        );
        expect(esClient.count).not.toHaveBeenCalled();
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);

        expect(bulkMock).toHaveBeenCalledTimes(1);
        const ops = bulkMock.mock.calls[0][0].operations;
        expect(ops).toHaveLength(2);
        expect(ops[0].index._id).toBe('mock-uuid-1');
        expect(ops[1].index._id).toBe('mock-uuid-2');
        expect(ops[0].index._id).not.toBe(ops[1].index._id);
        expect(ops[0].index.document).toEqual(
          expect.objectContaining({
            id: 'mock-uuid-1',
            title: 'First',
            content: 'one',
            permissions: {
              kibana: { privileges: [{ name: 'saved_object:lens/get' }] },
              elasticsearch: { indices: [] },
            },
            ingestion_method: 'manual',
          })
        );
        expect(ops[1].index.document.id).toBe('mock-uuid-2');
        expect(ops[1].index.document.ingestion_method).toBe('manual');
        expect(ops[1].index.document.permissions).toEqual({
          kibana: { privileges: [{ name: 'saved_object:lens/get' }] },
          elasticsearch: { indices: [] },
        });
      });

      it('content-mode getPermissions throw: propagates the throw and leaves existing chunks intact', async () => {
        // Same fail-closed contract as origin mode, repeated here so the
        // content-mode framing in the warn line ('aborting content-mode
        // write') can't silently drift away from the origin-mode framing.
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const getPermissions = jest.fn().mockImplementation(() => {
          throw new Error('upstream lookup failed');
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getPermissions })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await expect(
          indexer.indexAttachment(
            createContentIndexerParams({
              originId: 'att-content-throws',
              attachmentType: 'lens',
              action: 'create',
              esClient,
              content: [{ type: 'lens', title: 'T', content: 'c' }],
            })
          )
        ).rejects.toThrow('upstream lookup failed');

        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('aborting content-mode write')
        );
        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
        expect(bulkMock).not.toHaveBeenCalled();
      });

      it('stamps empty permissions when content-mode type has no getPermissions hook', async () => {
        // Mirrors origin-mode behavior: a type without `getPermissions` opts
        // its data into "publicly readable within the space" — the read-path
        // filter treats `kibana.privileges: []` as no privileges required.
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens' /* no getPermissions */ })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createContentIndexerParams({
            originId: 'att-public',
            attachmentType: 'lens',
            action: 'create',
            esClient,
            content: [{ type: 'lens', title: 'Public', content: 'open' }],
          })
        );

        const ops = bulkMock.mock.calls[0][0].operations;
        expect(ops[0].index.document.permissions).toEqual({
          kibana: { privileges: [] },
          elasticsearch: { indices: [] },
        });
      });

      it('content mode for an unregistered type writes chunks with empty permissions and warns once per type', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const registry = createMockRegistry(undefined);
        registry.list.mockReturnValue([]);
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const contextLogger = createMockLogger();
        const indexer = createSmlIndexer({ registry, logger });

        // Content mode now accepts any `attachmentType` so workflow
        // authors can write ad-hoc content without first registering a
        // SmlTypeDefinition. The trade-off is intentionally surfaced:
        // (a) the chunk has no permission gate (empty SmlPermissions),
        // (b) the indexer logs a once-per-process warn naming the
        // namespace so operators see when a new unregistered namespace
        // starts being written.
        await indexer.indexAttachment(
          createContentIndexerParams({
            originId: 'att-no-type',
            attachmentType: 'my_notes',
            action: 'create',
            esClient,
            logger: contextLogger,
            content: [{ type: 'my_notes', title: 'T', content: 'c' }],
          })
        );

        // First write of this namespace → warn fired with the type id.
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining(`unregistered type 'my_notes'`)
        );
        const firstWarnCount = (logger.warn as jest.Mock).mock.calls.length;

        // Existing chunks for the origin were wiped, then the new chunk
        // was written with empty permissions.
        expect(esClient.deleteByQuery).toHaveBeenCalled();
        expect(bulkMock).toHaveBeenCalledTimes(1);
        const ops = bulkMock.mock.calls[0][0].operations;
        expect(ops[0].index.document.permissions).toEqual({
          kibana: { privileges: [] },
          elasticsearch: { indices: [] },
        });
        // Document type is preserved on the stored chunk so reads can
        // still filter by it via the existing `type` term query.
        expect(ops[0].index.document.type).toBe('my_notes');
        expect(ops[0].index.document.ingestion_method).toBe('manual');

        // Second write of the *same* namespace → no additional warn
        // (the once-per-process Set has the type recorded).
        await indexer.indexAttachment(
          createContentIndexerParams({
            originId: 'att-no-type-2',
            attachmentType: 'my_notes',
            action: 'create',
            esClient,
            logger: contextLogger,
            content: [{ type: 'my_notes', title: 'T2', content: 'c2' }],
          })
        );
        expect((logger.warn as jest.Mock).mock.calls.length).toBe(firstWarnCount);

        // A *different* unregistered namespace fires a fresh warn —
        // the dedup is per-type, not global.
        await indexer.indexAttachment(
          createContentIndexerParams({
            originId: 'att-other',
            attachmentType: 'other_notes',
            action: 'create',
            esClient,
            logger: contextLogger,
            content: [{ type: 'other_notes', title: 'T3', content: 'c3' }],
          })
        );
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining(`unregistered type 'other_notes'`)
        );
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
          { term: { 'origin.uri': 'lens://att-delete-with-content' } },
          { term: { ingestion_method: 'crawled' } },
        ]);
      });
    });

    describe('getPermissions hook', () => {
      it('origin-mode: stamps fully-shaped empty permissions when type has no getPermissions hook', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const smlData = {
          chunks: [{ type: 'lens', title: 'No Perms', content: 'c' }],
        };
        const getSmlData = jest.fn().mockResolvedValue(smlData);
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData /* no getPermissions */ })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createIndexerParams({
            originId: 'att-no-perms',
            attachmentType: 'lens',
            action: 'create',
            esClient,
          })
        );

        const bulkCall = bulkMock.mock.calls[0][0];
        expect(bulkCall.operations[0].index.document.permissions).toEqual({
          kibana: { privileges: [] },
          elasticsearch: { indices: [] },
        });
      });

      it('awaits async getPermissions and stamps the resolved value', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const smlData = {
          chunks: [{ type: 'lens', title: 'T', content: 'c' }],
        };
        const getSmlData = jest.fn().mockResolvedValue(smlData);
        const getPermissions = jest.fn().mockImplementation(
          async () =>
            new Promise<{
              kibana: { privileges: Array<{ name: string }> };
              elasticsearch: { indices: unknown[] };
            }>((resolve) =>
              setImmediate(() =>
                resolve({
                  kibana: { privileges: [{ name: 'saved_object:lens/get' }] },
                  elasticsearch: { indices: [] },
                })
              )
            )
        );
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData, getPermissions })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createIndexerParams({
            originId: 'att-async',
            attachmentType: 'lens',
            action: 'create',
            esClient,
          })
        );

        expect(getPermissions).toHaveBeenCalledTimes(1);
        const bulkCall = bulkMock.mock.calls[0][0];
        expect(bulkCall.operations[0].index.document.permissions).toEqual({
          kibana: { privileges: [{ name: 'saved_object:lens/get' }] },
          elasticsearch: { indices: [] },
        });
      });

      it('getPermissions returning partial shape gets folded into fully-shaped permissions', async () => {
        // Half-populated returns from a hand-written hook are common — the
        // indexer normalises them so the document mapping always sees both
        // sub-arrays.
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const smlData = {
          chunks: [{ type: 'lens', title: 'T', content: 'c' }],
        };
        const getSmlData = jest.fn().mockResolvedValue(smlData);
        const getPermissions = jest.fn().mockReturnValue({
          kibana: { privileges: [{ name: 'p1' }] },
          // intentionally missing elasticsearch
        } as unknown);
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData, getPermissions })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createIndexerParams({
            originId: 'att-partial',
            attachmentType: 'lens',
            action: 'create',
            esClient,
          })
        );

        const bulkCall = bulkMock.mock.calls[0][0];
        expect(bulkCall.operations[0].index.document.permissions).toEqual({
          kibana: { privileges: [{ name: 'p1' }] },
          elasticsearch: { indices: [] },
        });
      });

      it('getPermissions throw: propagates the throw and leaves existing chunks intact (fail-closed)', async () => {
        // The previous implementation caught the throw, logged a warning,
        // and stamped empty SmlPermissions on the chunk. That was actually
        // FAIL-OPEN: the read-path filter treats `kbnPrivs.length === 0
        // && esIdx.length === 0` as "no privileges required" and returns
        // the chunk to any authenticated user in the space (see
        // sml_service.ts `permsOk` computation). A transient blip during
        // a crawl of sensitive resources would have silently de-gated
        // those chunks until the next successful crawl overwrote them.
        //
        // The current behaviour propagates the throw BEFORE any ES
        // mutation: the existing chunks for the origin remain intact,
        // the task runner sees a typed error and reschedules, and no
        // un-gated chunk is ever produced. We assert all three:
        //  - the throw bubbles out
        //  - deleteByQuery is never called (origin not wiped)
        //  - bulk is never called (no new chunk written)
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const smlData = {
          chunks: [{ type: 'lens', title: 'T', content: 'c' }],
        };
        const getSmlData = jest.fn().mockResolvedValue(smlData);
        const getPermissions = jest.fn().mockImplementation(() => {
          throw new Error('upstream lookup failed');
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData, getPermissions })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await expect(
          indexer.indexAttachment(
            createIndexerParams({
              originId: 'att-throws',
              attachmentType: 'lens',
              action: 'create',
              esClient,
            })
          )
        ).rejects.toThrow('upstream lookup failed');

        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining("type 'lens' getPermissions threw for origin 'att-throws'")
        );
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('aborting origin-mode write')
        );
        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
        expect(bulkMock).not.toHaveBeenCalled();
      });

      it('getPermissions is called once per origin (not once per chunk)', async () => {
        // `getPermissions(originId, ctx)` doesn't take a chunk — its
        // result is identical for every chunk produced by the same
        // origin's `getSmlData`. The implementation now hoists the call
        // out of the per-chunk loop both as a perf optimisation and as
        // a precondition for fail-closed semantics (we need a single
        // resolution point so a throw can abort the write atomically
        // before any ES mutation).
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const smlData = {
          chunks: [
            { type: 'lens', title: 'A', content: 'a' },
            { type: 'lens', title: 'B', content: 'b' },
            { type: 'lens', title: 'C', content: 'c' },
          ],
        };
        const getSmlData = jest.fn().mockResolvedValue(smlData);
        const getPermissions = jest.fn().mockResolvedValue({
          kibana: { privileges: [{ name: 'p1' }] },
          elasticsearch: { indices: [] },
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData, getPermissions })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createIndexerParams({
            originId: 'att-multi',
            attachmentType: 'lens',
            action: 'create',
            esClient,
          })
        );

        expect(getPermissions).toHaveBeenCalledTimes(1);
        // …and every chunk still got the same permissions stamped.
        const ops = bulkMock.mock.calls[0][0].operations;
        expect(ops).toHaveLength(3);
        for (const op of ops) {
          expect(op.index.document.permissions).toEqual({
            kibana: { privileges: [{ name: 'p1' }] },
            elasticsearch: { indices: [] },
          });
        }
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
      expect(callArgs.query.bool.filter).toEqual([
        { term: { 'origin.uri': 'lens://att-wipe-all' } },
      ]);
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
        { term: { 'origin.uri': 'lens://att-wipe-manual' } },
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
        { term: { 'origin.uri': 'lens://att-default-scope' } },
        { term: { ingestion_method: 'crawled' } },
      ]);
    });
  });
});
