/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { KiUsageService, selectDueForEnrichment } from './ki_usage_service';

const storageClient = {
  existsIndex: jest.fn(),
  bulk: jest.fn(),
};

jest.mock('@kbn/storage-adapter', () => ({
  ...jest.requireActual('@kbn/storage-adapter'),
  StorageIndexAdapter: jest.fn().mockImplementation(() => ({ getClient: () => storageClient })),
}));

const NOW = new Date('2026-10-27T12:00:00.000Z');

const found = (source: object) => ({
  docs: [
    {
      _index: '.contextengine-ki-usage-000001',
      _id: 'hashed',
      found: true,
      _seq_no: 4,
      _primary_term: 1,
      _source: source,
    },
  ],
});
const missing = {
  docs: [{ _index: '.contextengine-ki-usage-000001', _id: 'hashed', found: false }],
};

const createService = () => {
  jest.clearAllMocks();
  storageClient.existsIndex.mockResolvedValue(true);
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const service = new KiUsageService({
    esClient,
    logger: loggingSystemMock.createLogger(),
    getNow: () => NOW,
  });
  return { esClient, storage: storageClient, service };
};

const bulkOperations = (storage: typeof storageClient, call = 0) =>
  storage.bulk.mock.calls[call][0].operations;

describe('selectDueForEnrichment', () => {
  const usage = (kiId: string, newAccesses: number, lastEnrichedAt?: string) => ({
    ki_id: kiId,
    access_count: newAccesses,
    new_accesses: newAccesses,
    last_accessed_at: '2026-10-27T00:00:00.000Z',
    ...(lastEnrichedAt !== undefined && { last_enriched_at: lastEnrichedAt }),
  });

  it('keeps KIs with enough new reads that were not enriched too recently', () => {
    expect(
      selectDueForEnrichment(
        [
          usage('too-few', 2),
          usage('never-enriched', 3),
          usage('recent', 10, '2026-10-25T12:00:00.000Z'),
          usage('old', 4, '2026-10-01T12:00:00.000Z'),
        ],
        { minNewAccesses: 3, minDaysBetweenEnrichments: 7, limit: 10 },
        NOW
      ).map(({ ki_id: kiId }) => kiId)
    ).toEqual(['old', 'never-enriched']);
  });
});

describe('KiUsageService', () => {
  it('creates a usage document on the first read of a KI', async () => {
    const { esClient, storage, service } = createService();
    esClient.mget.mockResolvedValue(missing as never);
    storage.bulk.mockResolvedValue({ errors: false, items: [{ create: { status: 201 } }] });

    await service.recordAccess({ spaceId: 'default', kiIds: ['ki-1', 'ki-1'] });

    const operations = bulkOperations(storage);
    expect(operations).toEqual([
      {
        create: {
          _id: expect.stringMatching(/^[0-9a-f]{64}$/),
          document: {
            space: 'default',
            ki_id: 'ki-1',
            access_count: 1,
            first_accessed_at: NOW.toISOString(),
            last_accessed_at: NOW.toISOString(),
          },
        },
      },
    ]);
  });

  it('counts a further read with a revision check, keeping the enrichment state', async () => {
    const { esClient, storage, service } = createService();
    esClient.mget.mockResolvedValue(
      found({
        space: 'default',
        ki_id: 'ki-1',
        access_count: 5,
        first_accessed_at: '2026-10-01T00:00:00.000Z',
        last_accessed_at: '2026-10-20T00:00:00.000Z',
        last_enriched_at: '2026-10-10T00:00:00.000Z',
        access_count_at_enrichment: 3,
      }) as never
    );
    storage.bulk.mockResolvedValue({ errors: false, items: [{ index: { status: 200 } }] });

    await service.recordAccess({ spaceId: 'default', kiIds: ['ki-1'] });

    const operations = bulkOperations(storage);
    expect(operations[0].index).toMatchObject({ if_seq_no: 4, if_primary_term: 1 });
    expect(operations[0].index.document).toEqual({
      space: 'default',
      ki_id: 'ki-1',
      access_count: 6,
      first_accessed_at: '2026-10-01T00:00:00.000Z',
      last_accessed_at: NOW.toISOString(),
      last_enriched_at: '2026-10-10T00:00:00.000Z',
      access_count_at_enrichment: 3,
    });
  });

  it('retries a read that lost a race with another read of the same KI', async () => {
    const { esClient, storage, service } = createService();
    esClient.mget.mockResolvedValue(missing as never);
    storage.bulk
      .mockResolvedValueOnce({ errors: true, items: [{ create: { status: 409 } }] })
      .mockResolvedValueOnce({ errors: false, items: [{ create: { status: 201 } }] });

    await service.recordAccess({ spaceId: 'default', kiIds: ['ki-1'] });

    expect(storage.bulk).toHaveBeenCalledTimes(2);
  });

  it('counts reads again from an enrichment', async () => {
    const { esClient, storage, service } = createService();
    esClient.mget.mockResolvedValue(
      found({
        space: 'default',
        ki_id: 'ki-1',
        access_count: 8,
        first_accessed_at: '2026-10-01T00:00:00.000Z',
        last_accessed_at: '2026-10-20T00:00:00.000Z',
      }) as never
    );
    storage.bulk.mockResolvedValue({ errors: false, items: [{ index: { status: 200 } }] });

    await service.recordEnrichment({ spaceId: 'default', kiIds: ['ki-1'] });

    expect(bulkOperations(storage)[0].index.document).toMatchObject({
      access_count: 8,
      last_enriched_at: NOW.toISOString(),
      access_count_at_enrichment: 8,
    });
  });

  it('reports reads since the last enrichment as new', async () => {
    const { esClient, service } = createService();
    esClient.mget.mockResolvedValue(
      found({
        space: 'default',
        ki_id: 'ki-1',
        access_count: 8,
        first_accessed_at: '2026-10-01T00:00:00.000Z',
        last_accessed_at: '2026-10-20T00:00:00.000Z',
        last_enriched_at: '2026-10-10T00:00:00.000Z',
        access_count_at_enrichment: 6,
      }) as never
    );

    await expect(service.getUsage({ spaceId: 'default', kiIds: ['ki-1'] })).resolves.toEqual([
      {
        ki_id: 'ki-1',
        access_count: 8,
        new_accesses: 2,
        last_accessed_at: '2026-10-20T00:00:00.000Z',
        last_enriched_at: '2026-10-10T00:00:00.000Z',
      },
    ]);
  });

  it('reads nothing before the usage index exists', async () => {
    const { esClient, storage, service } = createService();
    storage.existsIndex.mockResolvedValue(false);

    await expect(service.getUsage({ spaceId: 'default', kiIds: ['ki-1'] })).resolves.toEqual([]);
    expect(esClient.mget).not.toHaveBeenCalled();
  });
});
