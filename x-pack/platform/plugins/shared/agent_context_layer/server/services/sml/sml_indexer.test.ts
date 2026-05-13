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

const createMockEsClient = (
  overrides: Partial<{
    deleteByQuery: jest.Mock;
    count: jest.Mock;
  }> = {}
): jest.Mocked<ElasticsearchClient> =>
  ({
    deleteByQuery: overrides.deleteByQuery ?? jest.fn().mockResolvedValue({ deleted: 0 }),
    // Default to "no direct chunks exist".
    count: overrides.count ?? jest.fn().mockResolvedValue({ count: 0 }),
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
  // Permissive default: grants access in the caller's space with no extra
  // permission requirements. Individual tests override this when they need
  // to exercise rejection paths (missing hook, cross-space, etc).
  resolveOriginAccess: jest
    .fn()
    .mockImplementation(async (_id: string, _ctx: unknown, spaceId: string) => ({
      spaces: [spaceId],
      permissions: [],
    })),
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
    spaceId: string;
    esClient: jest.Mocked<ElasticsearchClient>;
    logger: ReturnType<typeof createMockLogger>;
  }> = {}
) => ({
  originId: 'att-123',
  attachmentType: 'lens',
  action: 'create' as const,
  spaces: ['default'],
  // `spaceId` is required by the indexer's direct-mode access gate.
  // Resolved-mode tests don't read it, so providing a default here keeps
  // both modes simple.
  spaceId: 'default',
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
        query: { term: { origin_id: 'att-1' } },
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
        query: { term: { origin_id: 'att-2' } },
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
        source: 'resolved',
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
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failed to delete chunks'));
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

    describe('direct mode (caller-supplied chunks)', () => {
      it('overrides caller-supplied spaces/permissions with values from resolveOriginAccess', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const getSmlData = jest.fn();
        // resolveOriginAccess is the authoritative source: it grants the
        // caller's space and a fixed permission, ignoring whatever the
        // caller passed.
        const resolveOriginAccess = jest.fn().mockResolvedValue({
          spaces: ['default'],
          permissions: ['saved_object:dashboard/get'],
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData, resolveOriginAccess })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment({
          ...createIndexerParams({
            originId: 'direct-1',
            attachmentType: 'lens',
            action: 'create',
            // Caller TRIES to write to a space that doesn't match the
            // origin — must be ignored in favor of resolveOriginAccess.
            spaces: ['s1'],
            spaceId: 'default',
            esClient,
            logger,
          }),
          chunks: [
            {
              type: 'lens',
              title: 'Direct title',
              content: 'Direct content',
              // Caller also tries to set its own permissions — must be
              // overridden by the hook.
              permissions: ['perm-x'],
            },
          ],
        });

        expect(getSmlData).not.toHaveBeenCalled();
        expect(resolveOriginAccess).toHaveBeenCalledWith(
          'direct-1',
          expect.objectContaining({ esClient }),
          'default'
        );
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
        expect(bulkMock).toHaveBeenCalledTimes(1);
        const op = bulkMock.mock.calls[0][0].operations[0];
        expect(op.index._id).toBe('lens:direct-1:mock-uuid');
        expect(op.index.document).toEqual({
          id: 'lens:direct-1:mock-uuid',
          type: 'lens',
          title: 'Direct title',
          origin_id: 'direct-1',
          content: 'Direct content',
          created_at: expect.any(String),
          updated_at: expect.any(String),
          // Hook-derived, not caller-supplied.
          spaces: ['default'],
          permissions: ['saved_object:dashboard/get'],
          source: 'direct',
        });
      });

      it('rejects direct writes for unregistered types', async () => {
        const registry = createMockRegistry(undefined);
        registry.list.mockReturnValue([]);
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await expect(
          indexer.indexAttachment({
            ...createIndexerParams({
              originId: 'direct-2',
              attachmentType: 'unregistered',
              action: 'create',
              esClient,
              logger,
            }),
            chunks: [{ type: 'unregistered', title: 't', content: 'c' }],
          })
        ).rejects.toThrow(/Unknown SML attachment type/);
        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      });

      it('rejects direct writes when the type does not implement resolveOriginAccess', async () => {
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({
            id: 'lens',
            getSmlData: jest.fn(),
            resolveOriginAccess: undefined,
          })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await expect(
          indexer.indexAttachment({
            ...createIndexerParams({
              originId: 'direct-3',
              attachmentType: 'lens',
              action: 'create',
              esClient,
              logger,
            }),
            chunks: [{ type: 'lens', title: 't', content: 'c' }],
          })
        ).rejects.toThrow(/not direct-writable/);
      });

      it('rejects direct writes when no caller space is provided', async () => {
        const registry = createMockRegistry(createMockSmlTypeDefinition({ id: 'lens' }));
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await expect(
          indexer.indexAttachment({
            ...createIndexerParams({
              originId: 'direct-4',
              attachmentType: 'lens',
              action: 'create',
              esClient,
              logger,
            }),
            spaceId: undefined,
            chunks: [{ type: 'lens', title: 't', content: 'c' }],
          })
        ).rejects.toThrow(/requires a spaceId/);
      });

      it('rejects direct writes when resolveOriginAccess returns undefined', async () => {
        const resolveOriginAccess = jest.fn().mockResolvedValue(undefined);
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', resolveOriginAccess })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await expect(
          indexer.indexAttachment({
            ...createIndexerParams({
              originId: 'direct-5',
              attachmentType: 'lens',
              action: 'create',
              esClient,
              logger,
            }),
            chunks: [{ type: 'lens', title: 't', content: 'c' }],
          })
        ).rejects.toThrow(/not accessible from space/);
      });

      it('rejects cross-space writes when caller space is not in the origin spaces', async () => {
        const resolveOriginAccess = jest.fn().mockResolvedValue({
          spaces: ['other-space'],
          permissions: [],
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', resolveOriginAccess })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await expect(
          indexer.indexAttachment({
            ...createIndexerParams({
              originId: 'direct-6',
              attachmentType: 'lens',
              action: 'create',
              spaceId: 'default',
              esClient,
              logger,
            }),
            chunks: [{ type: 'lens', title: 't', content: 'c' }],
          })
        ).rejects.toThrow(/Cross-space write blocked/);
      });

      it('accepts writes when the origin lives in multiple spaces including the caller space', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const resolveOriginAccess = jest.fn().mockResolvedValue({
          spaces: ['default', 'marketing'],
          permissions: ['perm'],
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', resolveOriginAccess })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment({
          ...createIndexerParams({
            originId: 'direct-7',
            attachmentType: 'lens',
            action: 'create',
            spaceId: 'default',
            esClient,
            logger,
          }),
          chunks: [{ type: 'lens', title: 't', content: 'c' }],
        });

        const op = bulkMock.mock.calls[0][0].operations[0];
        expect(op.index.document.spaces).toEqual(['default', 'marketing']);
        expect(op.index.document.permissions).toEqual(['perm']);
      });

      it('accepts writes when the origin spaces include the wildcard', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const resolveOriginAccess = jest.fn().mockResolvedValue({
          spaces: ['*'],
          permissions: [],
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', resolveOriginAccess })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment({
          ...createIndexerParams({
            originId: 'direct-8',
            attachmentType: 'lens',
            action: 'create',
            spaceId: 'default',
            esClient,
            logger,
          }),
          chunks: [{ type: 'lens', title: 't', content: 'c' }],
        });

        const op = bulkMock.mock.calls[0][0].operations[0];
        expect(op.index.document.spaces).toEqual(['*']);
      });

      it('treats a thrown resolveOriginAccess as a deny', async () => {
        const resolveOriginAccess = jest.fn().mockRejectedValue(new Error('boom'));
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', resolveOriginAccess })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient();
        const indexer = createSmlIndexer({ registry, logger });

        await expect(
          indexer.indexAttachment({
            ...createIndexerParams({
              originId: 'direct-9',
              attachmentType: 'lens',
              action: 'create',
              esClient,
              logger,
            }),
            chunks: [{ type: 'lens', title: 't', content: 'c' }],
          })
        ).rejects.toThrow(/Failed to resolve access/);
      });

      it('treats an empty chunks array as a soft delete', async () => {
        const bulkMock = jest.fn();
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
            originId: 'direct-3',
            attachmentType: 'lens',
            action: 'update',
            esClient,
            logger,
          }),
          chunks: [],
        });

        expect(getSmlData).not.toHaveBeenCalled();
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
        expect(bulkMock).not.toHaveBeenCalled();
      });

      it('ignores caller-supplied chunks for the delete action (always deletes)', async () => {
        const bulkMock = jest.fn();
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
            originId: 'direct-4',
            attachmentType: 'lens',
            action: 'delete',
            esClient,
            logger,
          }),
          chunks: [{ type: 'lens', title: 'ignored', content: 'ignored' }],
        });

        expect(getSmlData).not.toHaveBeenCalled();
        expect(bulkMock).not.toHaveBeenCalled();
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      });
    });

    describe('source-based mutual exclusion (direct vs resolved)', () => {
      it('resolved create: skips when direct chunks already exist for the origin', async () => {
        const bulkMock = jest.fn();
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const getSmlData = jest.fn().mockResolvedValue({
          chunks: [{ type: 'lens', title: 'crawler', content: 'c' }],
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData })
        );
        const logger = createMockLogger();
        // direct chunks exist for this origin
        const esClient = createMockEsClient({
          count: jest.fn().mockResolvedValue({ count: 2 }),
        });
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createIndexerParams({
            originId: 'mixed-1',
            attachmentType: 'lens',
            action: 'create',
            esClient,
            logger,
          })
        );

        expect(esClient.count).toHaveBeenCalledTimes(1);
        const countCall = (esClient.count as jest.Mock).mock.calls[0][0];
        expect(countCall.query.bool.filter).toEqual(
          expect.arrayContaining([
            { term: { origin_id: 'mixed-1' } },
            { term: { source: 'direct' } },
          ])
        );
        expect(getSmlData).not.toHaveBeenCalled();
        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
        expect(bulkMock).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining('skipping resolved-mode index')
        );
      });

      it('resolved delete: skips when direct chunks already exist for the origin', async () => {
        const getSmlData = jest.fn();
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient({
          count: jest.fn().mockResolvedValue({ count: 1 }),
        });
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createIndexerParams({
            originId: 'mixed-2',
            attachmentType: 'lens',
            action: 'delete',
            esClient,
            logger,
          })
        );

        expect(esClient.count).toHaveBeenCalledTimes(1);
        expect(esClient.deleteByQuery).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining('skipping resolved-mode delete')
        );
      });

      it("explicit source='resolved' is respected (skips when direct exists)", async () => {
        const bulkMock = jest.fn();
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const getSmlData = jest.fn().mockResolvedValue({
          chunks: [{ type: 'lens', title: 't', content: 'c' }],
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient({
          count: jest.fn().mockResolvedValue({ count: 3 }),
        });
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment({
          ...createIndexerParams({
            originId: 'mixed-3',
            attachmentType: 'lens',
            action: 'create',
            esClient,
            logger,
          }),
          source: 'resolved',
        });

        expect(getSmlData).not.toHaveBeenCalled();
        expect(bulkMock).not.toHaveBeenCalled();
      });

      it('direct create: overrides existing resolved chunks without checking', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const getSmlData = jest.fn();
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData })
        );
        const logger = createMockLogger();
        // even with existing direct chunks (e.g. user re-indexing), direct should override
        const esClient = createMockEsClient({
          count: jest.fn().mockResolvedValue({ count: 5 }),
        });
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment({
          ...createIndexerParams({
            originId: 'override-1',
            attachmentType: 'lens',
            action: 'create',
            esClient,
            logger,
          }),
          chunks: [{ type: 'lens', title: 'override', content: 'new' }],
        });

        // No precedence check needed in direct mode — direct always wins.
        expect(esClient.count).not.toHaveBeenCalled();
        expect(getSmlData).not.toHaveBeenCalled();
        // deleteByQuery wipes everything for the origin (regardless of source).
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
        expect(esClient.deleteByQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            query: { term: { origin_id: 'override-1' } },
          })
        );
        expect(bulkMock).toHaveBeenCalledTimes(1);
        const op = bulkMock.mock.calls[0][0].operations[0];
        expect(op.index.document.source).toBe('direct');
      });

      it('direct delete: wipes all chunks regardless of crawler state', async () => {
        const esClient = createMockEsClient({
          count: jest.fn().mockResolvedValue({ count: 0 }),
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData: jest.fn() })
        );
        const logger = createMockLogger();
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment({
          ...createIndexerParams({
            originId: 'override-2',
            attachmentType: 'lens',
            action: 'delete',
            esClient,
            logger,
          }),
          source: 'direct',
        });

        expect(esClient.count).not.toHaveBeenCalled();
        expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      });

      it('resolved create: proceeds when no direct chunks exist', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const getSmlData = jest.fn().mockResolvedValue({
          chunks: [{ type: 'lens', title: 't', content: 'c' }],
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient(); // count defaults to 0
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createIndexerParams({
            originId: 'resolved-only',
            attachmentType: 'lens',
            action: 'create',
            esClient,
            logger,
          })
        );

        expect(esClient.count).toHaveBeenCalledTimes(1);
        expect(getSmlData).toHaveBeenCalledTimes(1);
        expect(bulkMock).toHaveBeenCalledTimes(1);
        const op = bulkMock.mock.calls[0][0].operations[0];
        expect(op.index.document.source).toBe('resolved');
      });

      it('resolved create: fails open when the precedence check throws non-404', async () => {
        const bulkMock = jest.fn().mockResolvedValue({ errors: false, items: [] });
        const getClientMock = jest.fn().mockReturnValue({ bulk: bulkMock });
        (createSmlStorage as jest.Mock).mockReturnValue({ getClient: getClientMock });

        const getSmlData = jest.fn().mockResolvedValue({
          chunks: [{ type: 'lens', title: 't', content: 'c' }],
        });
        const registry = createMockRegistry(
          createMockSmlTypeDefinition({ id: 'lens', getSmlData })
        );
        const logger = createMockLogger();
        const esClient = createMockEsClient({
          count: jest.fn().mockRejectedValue(new Error('cluster_block_exception')),
        });
        const indexer = createSmlIndexer({ registry, logger });

        await indexer.indexAttachment(
          createIndexerParams({
            originId: 'fail-open-1',
            attachmentType: 'lens',
            action: 'create',
            esClient,
            logger,
          })
        );

        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('failed to check for direct chunks')
        );
        // Failing open means the resolved write proceeds.
        expect(getSmlData).toHaveBeenCalledTimes(1);
        expect(bulkMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
