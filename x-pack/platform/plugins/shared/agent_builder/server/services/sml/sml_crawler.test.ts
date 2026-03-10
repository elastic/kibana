/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { createSmlCrawlerStateStorage } from './sml_crawler_state_storage';
import { createSmlCrawler } from './sml_crawler';
import type { SmlTypeDefinition } from './types';

jest.mock('./sml_crawler_state_storage', () => {
  const client = {
    search: jest.fn(),
    bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    delete: jest.fn().mockResolvedValue({}),
    index: jest.fn().mockResolvedValue({}),
  };
  return {
    smlCrawlerStateIndexName: '.test-sml-crawler-state',
    createSmlCrawlerStateStorage: jest.fn().mockReturnValue({
      getClient: jest.fn().mockReturnValue(client),
    }),
  };
});

jest.mock('./sml_storage', () => ({
  smlIndexName: '.test-sml-data',
}));

const getMockStateClient = () =>
  (createSmlCrawlerStateStorage as jest.Mock)({ logger: {}, esClient: {} }).getClient();

const createMockDefinition = (overrides: Partial<SmlTypeDefinition> = {}): SmlTypeDefinition => ({
  id: 'test-type',
  list: jest.fn().mockResolvedValue([]),
  getSmlData: jest.fn().mockResolvedValue({ chunks: [] }),
  toAttachment: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockIndexer = {
  indexAttachment: jest.fn().mockResolvedValue(undefined),
};

const createMockLogger = () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  get: jest.fn().mockReturnThis(),
});

const createMockEsClient = (): jest.Mocked<ElasticsearchClient> => {
  const indices = {
    exists: jest.fn().mockResolvedValue(false),
    existsAlias: jest.fn().mockResolvedValue(false),
    delete: jest.fn().mockResolvedValue({ acknowledged: true }),
    deleteIndexTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
    get: jest.fn().mockResolvedValue({}),
  };
  return {
    indices,
    count: jest.fn().mockResolvedValue({ count: 0 }),
  } as unknown as jest.Mocked<ElasticsearchClient>;
};

const createMockSavedObjectsClient = (): jest.Mocked<ISavedObjectsRepository> =>
  ({} as jest.Mocked<ISavedObjectsRepository>);

describe('createSmlCrawler', () => {
  let logger: ReturnType<typeof createMockLogger>;
  let esClient: jest.Mocked<ElasticsearchClient>;
  let savedObjectsClient: jest.Mocked<ISavedObjectsRepository>;
  let mockStateClient: ReturnType<typeof getMockStateClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    esClient = createMockEsClient();
    savedObjectsClient = createMockSavedObjectsClient();
    mockStateClient = getMockStateClient();
    mockStateClient.search.mockResolvedValue({ hits: { hits: [] } });
    mockStateClient.bulk.mockResolvedValue({ errors: false, items: [] });
  });

  describe('cleanup runs once', () => {
    it('first crawl runs cleanupStaleConcreteIndices, second crawl skips it', async () => {
      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      const definition = createMockDefinition({ list: jest.fn().mockResolvedValue([]) });

      await crawler.crawl({ definition, esClient, savedObjectsClient });
      const firstCrawlExistsCalls = (esClient.indices.exists as jest.Mock).mock.calls.length;
      expect(firstCrawlExistsCalls).toBeGreaterThan(0);

      await crawler.crawl({ definition, esClient, savedObjectsClient });
      const secondCrawlExistsCalls = (esClient.indices.exists as jest.Mock).mock.calls.length;
      expect(secondCrawlExistsCalls).toBe(firstCrawlExistsCalls);
    });
  });

  describe('new items detected', () => {
    it('when list returns items not in state, creates state docs with update_action create', async () => {
      const items = [{ id: 'a', updatedAt: '2024-01-01', spaces: ['default'] }];
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue(items),
      });
      mockStateClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _id: 'test-type:a',
                _source: {
                  attachment_id: 'a',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: 'create',
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(mockStateClient.bulk).toHaveBeenCalled();
      const bulkCall = mockStateClient.bulk.mock.calls.find((c) =>
        c[0].operations?.some(
          (op: { index?: { document?: { update_action?: string } } }) =>
            op.index?.document?.update_action === 'create'
        )
      );
      expect(bulkCall).toBeDefined();
      const createOp = bulkCall![0].operations.find(
        (op: { index?: { document?: { update_action?: string } } }) =>
          op.index?.document?.update_action === 'create'
      );
      expect(createOp).toBeDefined();
      expect(createOp.index.document.attachment_id).toBe('a');
      expect(createOp.index.document.spaces).toEqual(['default']);
    });
  });

  describe('updated items', () => {
    it('when list returns item with newer updatedAt than state, creates update action', async () => {
      const items = [{ id: 'a', updatedAt: '2024-01-02', spaces: ['default'] }];
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue(items),
      });
      mockStateClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  attachment_id: 'a',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: null,
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      const bulkCall = mockStateClient.bulk.mock.calls.find((c) =>
        c[0].operations?.some(
          (op: { index?: { document?: { update_action?: string } } }) =>
            op.index?.document?.update_action === 'update'
        )
      );
      expect(bulkCall).toBeDefined();
      const updateOp = bulkCall![0].operations.find(
        (op: { index?: { document?: { update_action?: string } } }) =>
          op.index?.document?.update_action === 'update'
      );
      expect(updateOp).toBeDefined();
      expect(updateOp.index.document.updated_at).toBe('2024-01-02');
    });
  });

  describe('deleted items', () => {
    it('when state has items not in list, creates delete action', async () => {
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue([]),
      });
      mockStateClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  attachment_id: 'deleted-item',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: null,
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      const bulkCall = mockStateClient.bulk.mock.calls.find((c) =>
        c[0].operations?.some(
          (op: { index?: { document?: { update_action?: string } } }) =>
            op.index?.document?.update_action === 'delete'
        )
      );
      expect(bulkCall).toBeDefined();
      const deleteOp = bulkCall![0].operations.find(
        (op: { index?: { document?: { update_action?: string } } }) =>
          op.index?.document?.update_action === 'delete'
      );
      expect(deleteOp).toBeDefined();
      expect(deleteOp.index.document.attachment_id).toBe('deleted-item');
    });
  });

  describe('unchanged items', () => {
    it('when list matches state (same updatedAt, same spaces), no operations', async () => {
      const items = [{ id: 'a', updatedAt: '2024-01-01', spaces: ['default'] }];
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue(items),
      });
      mockStateClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  attachment_id: 'a',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: null,
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      const stateWriteCalls = mockStateClient.bulk.mock.calls.filter((c) =>
        c[0].operations?.some((op: { index?: { document?: { update_action?: string } } }) =>
          ['create', 'update', 'delete'].includes(op.index?.document?.update_action ?? '')
        )
      );
      expect(stateWriteCalls.length).toBe(0);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('no state changes needed'));
    });
  });

  describe('space change detection', () => {
    it('when item.spaces differs from state.spaces, creates update action', async () => {
      const items = [{ id: 'a', updatedAt: '2024-01-01', spaces: ['default', 'space-2'] }];
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue(items),
      });
      mockStateClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  attachment_id: 'a',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: null,
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      const bulkCall = mockStateClient.bulk.mock.calls.find((c) =>
        c[0].operations?.some(
          (op: { index?: { document?: { update_action?: string } } }) =>
            op.index?.document?.update_action === 'update'
        )
      );
      expect(bulkCall).toBeDefined();
      const updateOp = bulkCall![0].operations.find(
        (op: { index?: { document?: { update_action?: string } } }) =>
          op.index?.document?.update_action === 'update'
      );
      expect(updateOp).toBeDefined();
      expect(updateOp.index.document.spaces).toEqual(['default', 'space-2']);
    });
  });

  describe('processQueue', () => {
    it('for create/update calls indexer.indexAttachment then bulk ACKs with update_action null', async () => {
      const definition = createMockDefinition({
        list: jest
          .fn()
          .mockResolvedValue([{ id: 'a', updatedAt: '2024-01-01', spaces: ['default'] }]),
      });
      mockStateClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _id: 'test-type:a',
                _source: {
                  attachment_id: 'a',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: 'create',
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(mockIndexer.indexAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          attachmentId: 'a',
          attachmentType: 'test-type',
          action: 'create',
          spaces: ['default'],
        })
      );

      const ackBulkCalls = mockStateClient.bulk.mock.calls.filter((c) =>
        c[0].operations?.some(
          (op: { index?: { document?: { update_action?: string | null } } }) =>
            op.index?.document?.update_action === null
        )
      );
      expect(ackBulkCalls.length).toBeGreaterThan(0);
    });

    it('for delete calls indexer.indexAttachment with action delete then bulk ACKs with delete op', async () => {
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue([]),
      });
      mockStateClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  attachment_id: 'b',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: null,
                },
              },
            ],
          },
        })
        .mockResolvedValue({
          hits: {
            hits: [
              {
                _id: 'test-type:b',
                _source: {
                  attachment_id: 'b',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: 'delete',
                },
              },
            ],
          },
        });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(mockIndexer.indexAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          attachmentId: 'b',
          attachmentType: 'test-type',
          action: 'delete',
        })
      );

      const deleteAckCalls = mockStateClient.bulk.mock.calls.filter((c) =>
        c[0].operations?.some((op: { delete?: { _id?: string } }) => op.delete != null)
      );
      expect(deleteAckCalls.length).toBeGreaterThan(0);
    });

    it('batches all state ACK writes into a single bulk call', async () => {
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue([
          { id: 'a', updatedAt: '2024-01-01', spaces: ['default'] },
          { id: 'b', updatedAt: '2024-01-01', spaces: ['default'] },
        ]),
      });
      mockStateClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _id: 'test-type:a',
                _source: {
                  attachment_id: 'a',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: 'create',
                },
              },
              {
                _id: 'test-type:b',
                _source: {
                  attachment_id: 'b',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: 'create',
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      const ackBulkCalls = mockStateClient.bulk.mock.calls.filter((c) =>
        c[0].operations?.some(
          (op: { index?: { document?: { update_action?: string | null } }; delete?: unknown }) =>
            op.index?.document?.update_action === null || op.delete != null
        )
      );
      expect(ackBulkCalls.length).toBe(1);
      expect(ackBulkCalls[0][0].operations.length).toBe(2);
    });

    it('skips hits without _id and logs warning', async () => {
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue([]),
      });
      mockStateClient.search.mockResolvedValueOnce({ hits: { hits: [] } }).mockResolvedValue({
        hits: {
          hits: [
            {
              _id: undefined,
              _source: {
                attachment_id: 'no-id',
                attachment_type: 'test-type',
                spaces: ['default'],
                update_action: 'create',
              },
            },
          ],
        },
      });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(logger.warn).toHaveBeenCalledWith('SML crawler: skipping hit without _id');
      expect(mockIndexer.indexAttachment).not.toHaveBeenCalled();
    });
  });

  describe('state normalization', () => {
    it('old state docs with space_id and no spaces get normalized to spaces array', async () => {
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue([]),
      });
      mockStateClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  attachment_id: 'old-doc',
                  attachment_type: 'test-type',
                  space_id: 'default',
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: null,
                },
              },
            ],
          },
        })
        .mockResolvedValue({
          hits: {
            hits: [
              {
                _id: 'test-type:old-doc',
                _source: {
                  attachment_id: 'old-doc',
                  attachment_type: 'test-type',
                  space_id: 'default',
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: 'delete',
                },
              },
            ],
          },
        });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(mockIndexer.indexAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          attachmentId: 'old-doc',
          spaces: ['default'],
        })
      );
    });
  });

  describe('data integrity check', () => {
    it('when state has items but countSmlDocuments returns 0, resets state to force re-index', async () => {
      const items = [{ id: 'a', updatedAt: '2024-01-01', spaces: ['default'] }];
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue(items),
      });
      mockStateClient.search
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: {
                  attachment_id: 'a',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  created_at: '2024-01-01',
                  updated_at: '2024-01-01',
                  update_action: null,
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('data integrity mismatch'));
      const createOp = mockStateClient.bulk.mock.calls
        .flatMap((c) => c[0].operations ?? [])
        .find(
          (op: { index?: { document?: { update_action?: string } } }) =>
            op.index?.document?.update_action === 'create'
        );
      expect(createOp).toBeDefined();
    });
  });

  describe('list() failure', () => {
    it('logs error and returns without processing', async () => {
      const definition = createMockDefinition({
        list: jest.fn().mockRejectedValue(new Error('list failed')),
      });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('failed to list items'));
      expect(mockStateClient.bulk).not.toHaveBeenCalled();
      expect(mockIndexer.indexAttachment).not.toHaveBeenCalled();
    });
  });

  describe('state bulk failure', () => {
    it('logs error and returns without processing queue', async () => {
      const items = [{ id: 'a', updatedAt: '2024-01-01', spaces: ['default'] }];
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue(items),
      });
      mockStateClient.search.mockResolvedValue({ hits: { hits: [] } });
      mockStateClient.bulk
        .mockRejectedValueOnce(new Error('bulk failed'))
        .mockResolvedValue({ errors: false, items: [] });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('failed to update state'));
      expect(mockIndexer.indexAttachment).not.toHaveBeenCalled();
    });
  });

  describe('loadCrawlerState with search_after pagination', () => {
    it('when stateClient.search returns full page, makes another call with search_after', async () => {
      const pageSize = 1000;
      const firstPageHits = Array.from({ length: pageSize }, (_, i) => ({
        _source: {
          attachment_id: `item-${i}`,
          attachment_type: 'test-type',
          spaces: ['default'],
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          update_action: null,
        },
        sort: [`item-${i}`],
      }));
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue([]),
      });
      mockStateClient.search
        .mockResolvedValueOnce({
          hits: { hits: firstPageHits },
        })
        .mockResolvedValueOnce({
          hits: { hits: [] },
        })
        .mockResolvedValue({ hits: { hits: [] } });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(mockStateClient.search).toHaveBeenCalledTimes(3);
      const secondCall = mockStateClient.search.mock.calls[1][0];
      expect(secondCall.search_after).toEqual([`item-${pageSize - 1}`]);
    });
  });

  describe('loadCrawlerState error', () => {
    it('logs warning and returns empty array', async () => {
      const items = [{ id: 'a', updatedAt: '2024-01-01', spaces: ['default'] }];
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue(items),
      });
      mockStateClient.search
        .mockRejectedValueOnce(new Error('search failed'))
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 0 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to load crawler state')
      );
      const createOp = mockStateClient.bulk.mock.calls
        .flatMap((c) => c[0].operations ?? [])
        .find(
          (op: { index?: { document?: { update_action?: string } } }) =>
            op.index?.document?.update_action === 'create'
        );
      expect(createOp).toBeDefined();
    });
  });
});
