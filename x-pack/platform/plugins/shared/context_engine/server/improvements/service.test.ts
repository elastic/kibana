/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ImprovementEnvelope } from '../../common/http_api/improvements';
import { ImprovementsService } from './service';
import { createImprovementsStorageClient } from './storage';

jest.mock('./storage');

const createImprovementsStorageClientMock = createImprovementsStorageClient as jest.MockedFunction<
  typeof createImprovementsStorageClient
>;

const makeImprovement = (overrides: Partial<ImprovementEnvelope> = {}): ImprovementEnvelope => ({
  improvement_id: 'imp-1',
  ai_index_id: 'support',
  status: 'proposed',
  action: 'add_ki',
  title: 'Add a KI for refund policy questions',
  rationale: 'Six retrievals for refund questions returned no rows.',
  payload: { ki: { title: 'Refund policy', content: 'Refunds are issued within 30 days.' } },
  suggested_at: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('ImprovementsService', () => {
  const storageClient = {
    bulk: jest.fn(),
    index: jest.fn(),
    reconcileMappings: jest.fn(),
  } as unknown as ReturnType<typeof createImprovementsStorageClient>;

  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();

  let service: ImprovementsService;

  beforeEach(() => {
    jest.clearAllMocks();
    createImprovementsStorageClientMock.mockReturnValue(storageClient);
    (storageClient.reconcileMappings as jest.Mock).mockResolvedValue(undefined);
    (storageClient.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [] });
    (storageClient.index as jest.Mock).mockResolvedValue({ result: 'updated' });
    service = new ImprovementsService({ esClient, logger });
  });

  it('creates a storage client bound to the requested space', async () => {
    await service.ensureIndex('default');
    expect(createImprovementsStorageClientMock).toHaveBeenCalledWith({
      esClient,
      logger,
      spaceId: 'default',
    });
  });

  it('creates one storage client per space and caches it', async () => {
    await service.ensureIndex('default');
    await service.ensureIndex('default');
    await service.ensureIndex('marketing');

    expect(createImprovementsStorageClientMock).toHaveBeenCalledTimes(2);
    expect(createImprovementsStorageClientMock).toHaveBeenCalledWith({
      esClient,
      logger,
      spaceId: 'marketing',
    });
  });

  describe('ensureIndex', () => {
    it('reconciles the space index mappings', async () => {
      await service.ensureIndex('default');
      expect(storageClient.reconcileMappings).toHaveBeenCalledTimes(1);
    });
  });

  describe('write', () => {
    it('is a no-op for an empty batch', async () => {
      await service.write('default', []);
      expect(storageClient.bulk).not.toHaveBeenCalled();
    });

    it('bulk-indexes each improvement, refreshing so the review UI reads them back', async () => {
      const improvement = makeImprovement();

      await service.write('default', [improvement]);

      expect(storageClient.bulk).toHaveBeenCalledWith({
        operations: [{ index: { _id: improvement.improvement_id, document: improvement } }],
        refresh: 'wait_for',
        throwOnFail: true,
      });
    });

    it('uses improvement_id as the document _id (so a re-proposed suggestion overwrites)', async () => {
      const improvement = makeImprovement();

      await service.write('default', [improvement]);
      await service.write('default', [improvement]);

      for (const call of (storageClient.bulk as jest.Mock).mock.calls) {
        expect(call[0].operations[0].index._id).toBe(improvement.improvement_id);
      }
    });

    it('rejects when the storage client rejects (so the run is reported as failed)', async () => {
      (storageClient.bulk as jest.Mock).mockRejectedValue(new Error('bulk failed'));
      await expect(service.write('default', [makeImprovement()])).rejects.toThrow('bulk failed');
    });
  });

  describe('update', () => {
    it('indexes the transitioned improvement under its own id and waits for the refresh', async () => {
      const rejected = makeImprovement({
        status: 'rejected',
        rejected_at: '2026-08-02T00:00:00.000Z',
        resolution: { by: 'elastic' },
      });

      await service.update('default', rejected);

      expect(storageClient.index).toHaveBeenCalledWith({
        id: 'imp-1',
        document: rejected,
        refresh: 'wait_for',
      });
    });

    it('rejects when the storage client rejects (so the route reports the failure)', async () => {
      (storageClient.index as jest.Mock).mockRejectedValue(new Error('index failed'));
      await expect(service.update('default', makeImprovement())).rejects.toThrow('index failed');
    });
  });

  // The store's index is only readable by Kibana's internal user, so every read has to run on the
  // service's own client rather than the caller's.
  describe('reads', () => {
    beforeEach(() => {
      esClient.search.mockResolvedValue({
        hits: { hits: [{ _source: makeImprovement() }], total: { value: 1, relation: 'eq' } },
      } as never);
    });

    it('lists an AI index’s improvements from the space index on the internal client', async () => {
      const result = await service.list('marketing', {
        aiIndexId: 'support',
        statuses: ['proposed'],
        from: 0,
        size: 25,
      });

      expect(result).toEqual({ improvements: [makeImprovement()], total: 1 });
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.contextengine-improvements-marketing',
          from: 0,
          size: 25,
        })
      );
    });

    it('reads the full history for the agent', async () => {
      const history = await service.history('default', { aiIndexId: 'support', size: 50 });

      expect(history).toEqual([makeImprovement()]);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: '.contextengine-improvements-default', size: 50 })
      );
    });

    it('fetches a batch of improvements by id', async () => {
      const found = await service.getByIds('default', ['imp-1']);

      expect(found).toEqual([makeImprovement()]);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: [{ terms: { improvement_id: ['imp-1'] } }] } },
        })
      );
    });

    it('fetches a single improvement by id', async () => {
      const found = await service.getById('default', 'imp-1');

      expect(found).toEqual(makeImprovement());
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { bool: { filter: [{ term: { improvement_id: 'imp-1' } }] } },
        })
      );
    });
  });
});
