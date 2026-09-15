/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { MemoryEntry } from './types';
import { MemoryServiceImpl } from './memory_service';
import { MEMORIES_DATA_STREAM } from '../../../../common/memory_and_investigation';
import { type StoredMemoryPage } from './data_stream';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import { v4 as uuidV4 } from 'uuid';

const mockedUuidV4 = uuidV4 as jest.MockedFunction<() => string>;

const createInMemoryEsClient = () => {
  const memoryDocs = new Map<string, StoredMemoryPage>();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  esClient.index.mockImplementation(async (params) => {
    const request = params as { index?: string; id?: string; document?: StoredMemoryPage };
    if (request.index === MEMORIES_DATA_STREAM && request.id && request.document) {
      memoryDocs.set(request.id, request.document);
    }
    return { result: 'created' } as never;
  });

  esClient.get.mockImplementation(async (params) => {
    const request = params as { index?: string; id?: string };
    if (request.index === MEMORIES_DATA_STREAM && request.id) {
      const doc = memoryDocs.get(request.id);
      if (doc) {
        return { found: true, _source: doc } as never;
      }
    }
    return { found: false } as never;
  });

  esClient.delete.mockImplementation(async (params) => {
    const request = params as { index?: string; id?: string };
    if (request.index === MEMORIES_DATA_STREAM && request.id) {
      memoryDocs.delete(request.id);
    }
    return { result: 'deleted' } as never;
  });

  esClient.search.mockImplementation(async (params) => {
    const request = params as {
      index?: string;
      query?: Record<string, any>;
      retriever?: Record<string, any>;
      size?: number;
    };

    if (request.index !== MEMORIES_DATA_STREAM) {
      return { hits: { hits: [], total: { value: 0 } } } as never;
    }

    const docs = Array.from(memoryDocs.entries()).map(([id, source]) => ({
      _id: id,
      _source: source,
    }));

    // Simple mock filtering based on term/terms/match_all
    let filtered = docs;
    const query = request.query;

    if (query?.term) {
      const term = query.term as Record<string, any>;
      const [[field, value]] = Object.entries(term);
      filtered = docs.filter(({ _source }) => {
        if (field === 'attributes.name') {
          return _source.attributes?.name === value;
        }
        if (field === 'attributes.categories') {
          return _source.attributes?.categories?.includes(value);
        }
        if (field === 'attributes.references') {
          return _source.attributes?.references?.includes(value);
        }
        return false;
      });
    }

    return {
      hits: {
        hits: filtered.map(({ _id, _source }) => ({
          _id,
          _source,
          _score: 1.0,
        })),
        total: { value: filtered.length },
      },
    } as never;
  });

  return { esClient, memoryDocs };
};

describe('MemoryServiceImpl', () => {
  const user = 'test-user';
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();
    mockedUuidV4.mockReset();
  });

  const createService = () => {
    const { esClient, memoryDocs } = createInMemoryEsClient();
    const service = new MemoryServiceImpl({ logger, esClient });
    return { service, esClient, memoryDocs };
  };

  it('creates, reads, updates, and lists a memory page', async () => {
    mockedUuidV4
      .mockReturnValueOnce('entry-uuid-1')
      .mockReturnValueOnce('history-uuid-1')
      .mockReturnValueOnce('history-uuid-2');
    const { service } = createService();

    const created = await service.create({
      name: 'nginx-overview',
      title: 'Nginx overview',
      content: '# Nginx',
      categories: ['services'],
      user,
    });

    expect(created).toMatchObject({
      id: 'entry-uuid-1',
      name: 'nginx-overview',
    });

    await expect(service.getByName({ name: 'nginx-overview' })).resolves.toMatchObject({
      title: 'Nginx overview',
    });

    mockedUuidV4.mockReturnValueOnce('history-uuid-3');
    const updated = await service.update({
      id: created.id,
      title: 'Nginx overview v2',
      user,
    });

    await expect(service.get({ id: created.id })).resolves.toMatchObject({
      title: 'Nginx overview v2',
    });

    await expect(service.listAll()).resolves.toEqual([
      expect.objectContaining({ name: 'nginx-overview', title: 'Nginx overview v2' }),
    ]);
  });

  it('deletes a page so it is removed from reads and listAll', async () => {
    mockedUuidV4
      .mockReturnValueOnce('entry-uuid-1')
      .mockReturnValueOnce('history-uuid-1')
      .mockReturnValueOnce('history-uuid-2');
    const { service } = createService();

    const created = await service.create({
      name: 'to-delete',
      title: 'Delete me',
      content: 'content',
      user,
    });

    await service.delete({ id: created.id, user });

    await expect(service.getByName({ name: 'to-delete' })).resolves.toBeUndefined();
    await expect(service.get({ id: created.id })).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    await expect(service.listAll()).resolves.toEqual([]);
    await expect(service.getCategoryTree()).resolves.toEqual({ tree: [], uncategorized: [] });
  });

  it('rejects creating a page when the name already exists', async () => {
    mockedUuidV4.mockReturnValueOnce('entry-uuid-1').mockReturnValueOnce('history-uuid-1');
    const { service } = createService();

    await service.create({
      name: 'duplicate',
      title: 'First',
      content: 'first',
      user,
    });

    await expect(
      service.create({
        name: 'duplicate',
        title: 'Second',
        content: 'second',
        user,
      })
    ).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
  });

  it('applies telemetry continuous decay calculation on read', async () => {
    mockedUuidV4.mockReturnValueOnce('entry-uuid-1').mockReturnValueOnce('history-uuid-1');
    const { service, memoryDocs } = createService();

    const created = await service.create({
      name: 'decay-test',
      title: 'Decay test',
      content: 'content',
      user,
    });

    // Manually set old last_impression_time and some impressions
    const doc = memoryDocs.get(created.id)!;
    doc.attributes.telemetry = {
      impressions: 10.0,
      conversions: 5.0,
      last_impression_time: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), // 1 half-life ago (7 days)
    };

    const fetched = await service.get({ id: created.id });
    
    // Impressions and conversions should have decayed by exactly half (decayFactor = 0.5)
    expect(fetched.labels?.useful).toBeCloseTo(0.5, 5); // 2.5 / 5.0 = 0.5
    expect(fetched.labels?.confidence).toBeLessThan(1.0);
  });

  it('Thompson sampling re-ranks browse results inside listAll', async () => {
    mockedUuidV4
      .mockReturnValueOnce('uuid-1')
      .mockReturnValueOnce('history-uuid-1')
      .mockReturnValueOnce('uuid-2')
      .mockReturnValueOnce('history-uuid-2');
    const { service, memoryDocs } = createService();

    const lowScorePage = await service.create({
      name: 'low-score',
      title: 'Low Score',
      content: 'content',
      user,
    });

    const highScorePage = await service.create({
      name: 'high-score',
      title: 'High Score',
      content: 'content',
      user,
    });

    const now = new Date().toISOString();
    memoryDocs.get(lowScorePage.id)!.attributes.telemetry = {
      impressions: 10.0,
      conversions: 1.0, // useful rate = 0.1
      last_impression_time: now,
    };

    memoryDocs.get(highScorePage.id)!.attributes.telemetry = {
      impressions: 10.0,
      conversions: 9.0, // useful rate = 0.9
      last_impression_time: now,
    };

    const listed = await service.listAll();
    
    // The high score page should have been reordered to the front
    expect(listed[0].id).toBe(highScorePage.id);
    expect(listed[1].id).toBe(lowScorePage.id);
  });
});
