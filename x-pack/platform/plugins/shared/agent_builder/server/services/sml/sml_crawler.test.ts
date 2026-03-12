/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
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

const createMockLogger = () => {
  const log = loggerMock.create();
  log.get = jest.fn().mockReturnValue(log);
  return log;
};

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
      const bulkCall = mockStateClient.bulk.mock.calls.find((c: unknown[]) =>
        (
          c[0] as { operations?: Array<{ index?: { document?: { update_action?: string } } }> }
        ).operations?.some(
          (op: { index?: { document?: { update_action?: string } } }) =>
            op.index?.document?.update_action === 'create'
        )
      );
      expect(bulkCall).toBeDefined();
      const createOp = (
        bulkCall![0] as {
          operations?: Array<{ index?: { document?: { update_action?: string } } }>;
        }
      ).operations?.find(
        (op: { index?: { document?: { update_action?: string } } }) =>
          op.index?.document?.update_action === 'create'
      );
      expect(createOp).toBeDefined();
      const createOpDoc = (
        createOp as { index?: { document?: { attachment_id?: string; spaces?: string[] } } }
      ).index?.document;
      expect(createOpDoc?.attachment_id).toBe('a');
      expect(createOpDoc?.spaces).toEqual(['default']);
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
                  update_action: undefined,
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      const bulkCall = mockStateClient.bulk.mock.calls.find((c: unknown[]) =>
        (
          c[0] as { operations?: Array<{ index?: { document?: { update_action?: string } } }> }
        ).operations?.some(
          (op: { index?: { document?: { update_action?: string } } }) =>
            op.index?.document?.update_action === 'update'
        )
      );
      expect(bulkCall).toBeDefined();
      const updateOp = (
        bulkCall![0] as {
          operations?: Array<{ index?: { document?: { update_action?: string } } }>;
        }
      ).operations?.find(
        (op: { index?: { document?: { update_action?: string } } }) =>
          op.index?.document?.update_action === 'update'
      );
      expect(updateOp).toBeDefined();
      const updateOpDoc = (updateOp as { index?: { document?: { updated_at?: string } } }).index
        ?.document;
      expect(updateOpDoc?.updated_at).toBe('2024-01-02');
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
                  update_action: undefined,
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      const bulkCall = mockStateClient.bulk.mock.calls.find((c: unknown[]) =>
        (
          c[0] as { operations?: Array<{ index?: { document?: { update_action?: string } } }> }
        ).operations?.some(
          (op: { index?: { document?: { update_action?: string } } }) =>
            op.index?.document?.update_action === 'delete'
        )
      );
      expect(bulkCall).toBeDefined();
      const deleteOp = (
        bulkCall![0] as {
          operations?: Array<{ index?: { document?: { update_action?: string } } }>;
        }
      ).operations?.find(
        (op: { index?: { document?: { update_action?: string } } }) =>
          op.index?.document?.update_action === 'delete'
      );
      expect(deleteOp).toBeDefined();
      const deleteOpDoc = (deleteOp as { index?: { document?: { attachment_id?: string } } }).index
        ?.document;
      expect(deleteOpDoc?.attachment_id).toBe('deleted-item');
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
                  update_action: undefined,
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      const stateWriteCalls = mockStateClient.bulk.mock.calls.filter((c: unknown[]) =>
        (
          c[0] as { operations?: Array<{ index?: { document?: { update_action?: string } } }> }
        ).operations?.some((op: { index?: { document?: { update_action?: string } } }) =>
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
                  update_action: undefined,
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      const bulkCall = mockStateClient.bulk.mock.calls.find((c: unknown[]) =>
        (
          c[0] as { operations?: Array<{ index?: { document?: { update_action?: string } } }> }
        ).operations?.some(
          (op: { index?: { document?: { update_action?: string } } }) =>
            op.index?.document?.update_action === 'update'
        )
      );
      expect(bulkCall).toBeDefined();
      const updateOp = (
        bulkCall![0] as {
          operations?: Array<{ index?: { document?: { update_action?: string } } }>;
        }
      ).operations?.find(
        (op: { index?: { document?: { update_action?: string } } }) =>
          op.index?.document?.update_action === 'update'
      );
      expect(updateOp).toBeDefined();
      const spaceUpdateDoc = (updateOp as { index?: { document?: { spaces?: string[] } } }).index
        ?.document;
      expect(spaceUpdateDoc?.spaces).toEqual(['default', 'space-2']);
    });
  });

  describe('processQueue', () => {
    it('for create/update calls indexer.indexAttachment then bulk ACKs with update_action undefined', async () => {
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
                sort: ['a'],
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

      const ackBulkCalls = mockStateClient.bulk.mock.calls.filter((c: unknown[]) =>
        (
          c[0] as { operations?: Array<{ index?: { document?: { update_action?: unknown } } }> }
        ).operations?.some(
          (op: { index?: { document?: { update_action?: unknown } } }) =>
            op.index?.document !== undefined && op.index.document.update_action === undefined
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
                  update_action: undefined,
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _id: 'test-type:b',
                sort: ['b'],
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
        })
        .mockResolvedValue({ hits: { hits: [] } });
      (esClient.count as jest.Mock).mockResolvedValue({ count: 1 });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(mockIndexer.indexAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          attachmentId: 'b',
          attachmentType: 'test-type',
          action: 'delete',
        })
      );

      const deleteAckCalls = mockStateClient.bulk.mock.calls.filter((c: unknown[]) =>
        (c[0] as { operations?: Array<{ delete?: { _id?: string } }> }).operations?.some(
          (op: { delete?: { _id?: string } }) => op.delete != null
        )
      );
      expect(deleteAckCalls.length).toBeGreaterThan(0);
    });

    it('batches all state ACK writes into a single bulk call per page', async () => {
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
                sort: ['a'],
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
                sort: ['b'],
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

      const ackBulkCalls = mockStateClient.bulk.mock.calls.filter((c: unknown[]) =>
        (
          c[0] as {
            operations?: Array<{
              index?: { document?: { update_action?: unknown } };
              delete?: unknown;
            }>;
          }
        ).operations?.some(
          (op: { index?: { document?: { update_action?: unknown } }; delete?: unknown }) =>
            (op.index?.document !== undefined && op.index.document.update_action === undefined) ||
            op.delete != null
        )
      );
      expect(ackBulkCalls.length).toBe(1);
      expect(ackBulkCalls[0][0].operations.length).toBe(2);
    });

    it('skips hits without _id and logs warning', async () => {
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue([]),
      });
      mockStateClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _id: undefined,
                sort: ['no-id'],
                _source: {
                  attachment_id: 'no-id',
                  attachment_type: 'test-type',
                  spaces: ['default'],
                  update_action: 'create',
                },
              },
            ],
          },
        })
        .mockResolvedValue({ hits: { hits: [] } });

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(logger.warn).toHaveBeenCalledWith('SML crawler: skipping hit without _id');
      expect(mockIndexer.indexAttachment).not.toHaveBeenCalled();
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
                  update_action: undefined,
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
        .flatMap((c: unknown[]) => (c[0] as { operations?: unknown[] }).operations ?? [])
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
          update_action: undefined,
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
    it('skips crawl cycle and logs error when state loading fails', async () => {
      const items = [{ id: 'a', updatedAt: '2024-01-01', spaces: ['default'] }];
      const definition = createMockDefinition({
        list: jest.fn().mockResolvedValue(items),
      });
      mockStateClient.search.mockRejectedValueOnce(new Error('search failed'));

      const crawler = createSmlCrawler({ indexer: mockIndexer, logger });
      await crawler.crawl({ definition, esClient, savedObjectsClient });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed to load crawler state')
      );
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('skipping crawl cycle'));
      expect(mockStateClient.bulk).not.toHaveBeenCalled();
      expect(mockIndexer.indexAttachment).not.toHaveBeenCalled();
    });
  });
});
