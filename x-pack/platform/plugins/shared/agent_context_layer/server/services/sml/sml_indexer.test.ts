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
import type { SmlTypeDefinition } from './types';

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

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

const createMockEsClient = (): jest.Mocked<ElasticsearchClient> =>
  ({
    deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
    // Default: no existing manual entries for any origin_id.
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
  overrides: Partial<{
    originId: string;
    attachmentType: string;
    action: 'create' | 'update' | 'delete';
    spaces: string[];
    esClient: jest.Mocked<ElasticsearchClient>;
    logger: ReturnType<typeof createMockLogger>;
  }> = {}
) => ({
  originId: 'att-123',
  attachmentType: 'lens',
  action: 'create' as const,
  spaces: ['default'],
  esClient: createMockEsClient(),
  savedObjectsClient: {} as unknown as ISavedObjectsRepository,
  logger: createMockLogger(),
  ...overrides,
});

describe('createSmlIndexer', () => {
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
            filter: [{ term: { origin_id: 'att-1' } }, { term: { ingestion_method: 'crawled' } }],
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
        query: { bool: { filter: [{ term: { origin_id: 'att-2' } }] } },
        refresh: false,
      });
      expect(bulkMock).toHaveBeenCalledTimes(1);
      const bulkCall = bulkMock.mock.calls[0][0];
      expect(bulkCall.refresh).toBe('wait_for');
      expect(bulkCall.operations).toHaveLength(1);
      expect(bulkCall.operations[0].index._id).toBe('lens:att-2:mock-uuid');
      expect(bulkCall.operations[0].index.document).toEqual({
        id: 'lens:att-2:mock-uuid',
        type: 'lens',
        title: 'My Viz',
        origin_id: 'att-2',
        content: 'content',
        created_at: expect.any(String),
        updated_at: expect.any(String),
        spaces: ['default', 'space-2'],
        permissions: ['perm1'],
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
      it('writes provided chunks with deterministic ids and ingestion_method=manual', async () => {
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

        await indexer.indexAttachment({
          ...createIndexerParams({
            originId: 'att-manual',
            attachmentType: 'lens',
            action: 'create',
            spaces: ['default'],
            esClient,
          }),
          content: [
            { type: 'lens', title: 'First', content: 'one', permissions: ['p1'] },
            { type: 'lens', title: 'Second', content: 'two' },
          ],
        });

        // getSmlData must NOT be called in content mode
        expect(getSmlData).not.toHaveBeenCalled();
        // Manual-protection check is also skipped in content mode
        expect(esClient.count).not.toHaveBeenCalled();
        // Existing chunks for this origin_id are still removed before write
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);

        expect(bulkMock).toHaveBeenCalledTimes(1);
        const ops = bulkMock.mock.calls[0][0].operations;
        expect(ops).toHaveLength(2);
        expect(ops[0].index._id).toBe('lens:att-manual:manual:0');
        expect(ops[1].index._id).toBe('lens:att-manual:manual:1');
        expect(ops[0].index.document).toEqual(
          expect.objectContaining({
            id: 'lens:att-manual:manual:0',
            title: 'First',
            origin_id: 'att-manual',
            content: 'one',
            permissions: ['p1'],
            ingestion_method: 'manual',
          })
        );
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

        await indexer.indexAttachment({
          ...createIndexerParams({
            originId: 'att-no-type',
            attachmentType: 'unregistered',
            action: 'create',
            esClient,
            logger,
          }),
          content: [{ type: 'unregistered', title: 'T', content: 'c' }],
        });

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

        await indexer.indexAttachment({
          ...createIndexerParams({
            originId: 'att-empty-manual',
            attachmentType: 'lens',
            action: 'create',
            esClient,
          }),
          content: [],
        });

        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
        expect(bulkMock).not.toHaveBeenCalled();
      });

      it('delete action removes chunks even with content provided', async () => {
        const bulkMock = jest.fn();
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens' }));
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment({
          ...createIndexerParams({
            originId: 'att-manual-del',
            attachmentType: 'lens',
            action: 'delete',
            esClient,
          }),
          content: [{ type: 'lens', title: 'unused', content: 'x' }],
        });

        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
        expect(bulkMock).not.toHaveBeenCalled();
      });
    });
  });
});
