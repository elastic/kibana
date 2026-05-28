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
import { MEMORIES_DATA_STREAM } from '../../../common/constants';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

import { v4 as uuidV4 } from 'uuid';

const mockedUuidV4 = uuidV4 as jest.MockedFunction<() => string>;

type MemoryDocument = MemoryEntry & { '@timestamp'?: string };

const sortByLatest = (a: MemoryDocument, b: MemoryDocument) => {
  if (b.version !== a.version) {
    return b.version - a.version;
  }
  return b.updated_at.localeCompare(a.updated_at);
};

const matchesFilter = (doc: MemoryDocument, filter: Record<string, unknown>): boolean =>
  Object.entries(filter).every(([field, value]) => doc[field as keyof MemoryDocument] === value);

const filterByQuery = (
  docs: MemoryDocument[],
  query: Record<string, unknown>
): MemoryDocument[] => {
  if (query.match_all) {
    return docs;
  }

  const bool = query.bool as { filter?: Array<Record<string, unknown>> } | undefined;
  if (!bool?.filter) {
    return docs;
  }

  return docs.filter((doc) =>
    bool.filter!.every((clause) => {
      if ('term' in clause) {
        const term = clause.term as Record<string, unknown>;
        return matchesFilter(doc, term);
      }
      if ('terms' in clause) {
        const terms = clause.terms as Record<string, unknown>;
        const [[field, values]] = Object.entries(terms);
        const fieldValues = values as unknown[];
        return fieldValues.includes(doc[field as keyof MemoryDocument]);
      }
      return true;
    })
  );
};

const collapseDocuments = (
  docs: MemoryDocument[],
  field: keyof MemoryDocument,
  size: number
): MemoryDocument[] => {
  const groups = new Map<string, MemoryDocument[]>();
  for (const doc of docs) {
    const key = String(doc[field]);
    const group = groups.get(key) ?? [];
    group.push(doc);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => group.sort(sortByLatest)[0]!)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, size);
};

const createInMemoryEsClient = () => {
  const memoryDocs: MemoryDocument[] = [];
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  esClient.index.mockImplementation(async ({ index, document }) => {
    if (index === MEMORIES_DATA_STREAM) {
      memoryDocs.push(document as MemoryDocument);
    }
    return { result: 'created', _id: 'doc', _index: String(index), _shards: {} } as never;
  });

  esClient.search.mockImplementation(async (params) => {
    const request = params as {
      index?: string;
      query?: Record<string, unknown>;
      collapse?: { field?: string };
      size?: number;
    };

    if (request.index !== MEMORIES_DATA_STREAM || !request.query) {
      return { hits: { hits: [], total: { value: 0 } } } as never;
    }

    const filtered = filterByQuery(memoryDocs, request.query);
    const collapseField = request.collapse?.field as keyof MemoryDocument | undefined;
    const size = request.size ?? filtered.length;

    const winners = collapseField
      ? collapseDocuments(filtered, collapseField, size)
      : filtered.sort(sortByLatest).slice(0, size);

    return {
      hits: {
        hits: winners.map((source) => ({ _source: source })),
        total: { value: winners.length },
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
    const { esClient } = createInMemoryEsClient();
    const service = new MemoryServiceImpl({ logger, esClient });
    return { service, esClient };
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
      version: 1,
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

    expect(updated.version).toBe(2);
    await expect(service.get({ id: created.id })).resolves.toMatchObject({
      title: 'Nginx overview v2',
      version: 2,
    });

    await expect(service.listAll()).resolves.toEqual([
      expect.objectContaining({ name: 'nginx-overview', version: 2 }),
    ]);
  });

  it('soft-deletes a page so it is hidden from reads and listAll', async () => {
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
    await expect(service.getCategoryTree()).resolves.toEqual([]);
  });

  it('restores a deleted page when recreated with the same name', async () => {
    mockedUuidV4
      .mockReturnValueOnce('entry-uuid-1')
      .mockReturnValueOnce('history-uuid-1')
      .mockReturnValueOnce('history-uuid-2')
      .mockReturnValueOnce('history-uuid-3');
    const { service } = createService();

    const created = await service.create({
      name: 'restorable-page',
      title: 'Original',
      content: 'original body',
      categories: ['test'],
      user,
    });

    await service.delete({ id: created.id, user });

    const restored = await service.create({
      name: 'restorable-page',
      title: 'Restored',
      content: 'restored body',
      categories: ['test', 'restored'],
      user,
    });

    expect(restored).toMatchObject({
      id: created.id,
      name: 'restorable-page',
      title: 'Restored',
      content: 'restored body',
      version: 3,
      created_at: created.created_at,
      created_by: created.created_by,
    });
    expect(restored.is_deleted).not.toBe(true);

    await expect(service.getByName({ name: 'restorable-page' })).resolves.toMatchObject({
      title: 'Restored',
      version: 3,
    });
    await expect(service.listAll()).resolves.toEqual([
      expect.objectContaining({ name: 'restorable-page', version: 3 }),
    ]);
  });

  it('rejects creating a page when the name is already live', async () => {
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

  it('renames a page, tombstones the old name, and resolves get by id', async () => {
    mockedUuidV4
      .mockReturnValueOnce('entry-uuid-1')
      .mockReturnValueOnce('history-uuid-1')
      .mockReturnValueOnce('history-uuid-2');
    const { service } = createService();

    const created = await service.create({
      name: 'old-name',
      title: 'Original title',
      content: 'original content',
      user,
    });

    mockedUuidV4.mockReturnValueOnce('history-uuid-3');
    const renamed = await service.rename({
      id: created.id,
      newName: 'new-name',
      user,
    });

    expect(renamed).toMatchObject({
      id: created.id,
      name: 'new-name',
      version: 3,
    });

    await expect(service.getByName({ name: 'old-name' })).resolves.toBeUndefined();
    await expect(service.getByName({ name: 'new-name' })).resolves.toMatchObject({
      id: created.id,
      name: 'new-name',
      version: 3,
    });
    await expect(service.get({ id: created.id })).resolves.toMatchObject({
      name: 'new-name',
      version: 3,
    });
    await expect(service.listAll()).resolves.toEqual([
      expect.objectContaining({ id: created.id, name: 'new-name', version: 3 }),
    ]);
  });

  it('excludes soft-deleted pages from search results', async () => {
    mockedUuidV4
      .mockReturnValueOnce('entry-uuid-1')
      .mockReturnValueOnce('history-uuid-1')
      .mockReturnValueOnce('history-uuid-2')
      .mockReturnValueOnce('entry-uuid-2')
      .mockReturnValueOnce('history-uuid-3')
      .mockReturnValueOnce('history-uuid-4');
    const { service } = createService();

    const live = await service.create({
      name: 'live-page',
      title: 'Live page',
      content: 'live content',
      user,
    });

    const doomed = await service.create({
      name: 'deleted-page',
      title: 'Deleted page',
      content: 'deleted content',
      user,
    });

    await service.delete({ id: doomed.id, user });

    const results = await service.search({ query: 'page', size: 10 });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ id: live.id, name: 'live-page' });
  });
});
