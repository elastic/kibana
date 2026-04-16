/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMemoryClient } from './memory_client';
import type { MemoryClient } from './memory_client';
import type { MemoryCreateRequest, MemoryNode } from '@kbn/agent-builder-common';

// ---------------------------------------------------------------------------
// Mock the storage adapter
// ---------------------------------------------------------------------------

const mockStorageSearch = jest.fn();
const mockStorageIndex = jest.fn();
const mockStorageDelete = jest.fn();
const mockStorageBulk = jest.fn();

jest.mock('./storage', () => ({
  createStorage: jest.fn(() => ({
    getClient: () => ({
      search: mockStorageSearch,
      index: mockStorageIndex,
      delete: mockStorageDelete,
      bulk: mockStorageBulk,
    }),
  })),
  linksToStorage: jest.fn((links) => links),
  sourceRefsToStorage: jest.fn((refs) => refs),
  addEmbeddingMappingIfMissing: jest.fn().mockResolvedValue(undefined),
  memoryIndexName: '.chat-memory',
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const makeDocHit = (
  id: string,
  overrides: Partial<MemoryNode> = {}
): { _id: string; _source: Record<string, unknown> } => ({
  _id: id,
  _source: {
    space: 'default',
    user_name: 'test-user',
    type: 'semantic',
    summary: 'Test summary',
    full: 'Test full content',
    confidence: 0.8,
    salience: 0.5,
    recency: '2024-01-01T00:00:00.000Z',
    utility: 0.5,
    stability: 0.1,
    access_count: 0,
    reinforcement_score: 0,
    status: 'candidate',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    links: [],
    source_refs: [],
    ...overrides,
  },
});

const makeSearchResponse = (ids: string[], overrides: Partial<MemoryNode>[] = []) => ({
  hits: {
    hits: ids.map((id, i) => makeDocHit(id, overrides[i] ?? {})),
  },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MemoryClient', () => {
  let client: MemoryClient;
  const mockEsClient = {} as any;
  const mockLogger = {
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    client = createMemoryClient({
      esClient: mockEsClient,
      space: 'default',
      userName: 'test-user',
      userId: 'user-123',
      logger: mockLogger,
    });
  });

  // ---- get() ---------------------------------------------------------------

  describe('get()', () => {
    it('returns a memory node by id', async () => {
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse(['mem-001']));

      const result = await client.get('mem-001');

      expect(result.id).toBe('mem-001');
      expect(result.summary).toBe('Test summary');
      expect(result.type).toBe('semantic');
    });

    it('throws when memory is not found', async () => {
      mockStorageSearch.mockResolvedValueOnce({ hits: { hits: [] } });

      await expect(client.get('nonexistent')).rejects.toThrow('Memory node not found: nonexistent');
    });

    it('includes links and source_refs in the result', async () => {
      const docWithLinks = makeDocHit('mem-002', {
        links: [{ target_id: 'mem-003', type: 'related_to', weight: 0.8 }] as any,
        source_refs: [{ conversation_id: 'conv-1', round_id: 'round-1' }] as any,
      });
      mockStorageSearch.mockResolvedValueOnce({ hits: { hits: [docWithLinks] } });

      const result = await client.get('mem-002');

      expect(result.links).toHaveLength(1);
      expect(result.links[0].target_id).toBe('mem-003');
      expect(result.source_refs).toHaveLength(1);
      expect(result.source_refs[0].conversation_id).toBe('conv-1');
    });
  });

  // ---- list() --------------------------------------------------------------

  describe('list()', () => {
    it('returns all memory nodes for the current user in the current space', async () => {
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse(['mem-001', 'mem-002']));

      const result = await client.list();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('mem-001');
      expect(result[1].id).toBe('mem-002');
    });

    it('passes type filter when specified', async () => {
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse([]));

      await client.list({ type: 'procedural' });

      const searchCall = mockStorageSearch.mock.calls[0][0];
      expect(JSON.stringify(searchCall)).toContain('procedural');
    });

    it('passes status filter when specified', async () => {
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse([]));

      await client.list({ status: 'established' });

      const searchCall = mockStorageSearch.mock.calls[0][0];
      expect(JSON.stringify(searchCall)).toContain('established');
    });

    it('passes multiple statuses', async () => {
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse([]));

      await client.list({ status: ['provisional', 'established'] });

      const searchCall = mockStorageSearch.mock.calls[0][0];
      expect(JSON.stringify(searchCall)).toContain('provisional');
      expect(JSON.stringify(searchCall)).toContain('established');
    });
  });

  // ---- create() ------------------------------------------------------------

  describe('create()', () => {
    const baseRequest: MemoryCreateRequest = {
      type: 'semantic',
      summary: 'User prefers TypeScript',
      full: 'User consistently chooses TypeScript over JavaScript for new projects.',
      confidence: 0.9,
      space: 'default',
      user_name: 'test-user',
    };

    beforeEach(() => {
      // First call for create -> index (no return needed)
      mockStorageIndex.mockResolvedValue({ result: 'created' });
      // Second call is the get() inside create()
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse(['new-id']));
    });

    it('creates a new memory node with generated id', async () => {
      const result = await client.create(baseRequest);

      expect(mockStorageIndex).toHaveBeenCalledTimes(1);
      const indexCall = mockStorageIndex.mock.calls[0][0];
      expect(indexCall.document.type).toBe('semantic');
      expect(indexCall.document.summary).toBe('User prefers TypeScript');
      expect(indexCall.document.status).toBe('candidate'); // default
      expect(result.id).toBe('new-id');
    });

    it('uses provided status if given', async () => {
      await client.create({ ...baseRequest, status: 'provisional' });

      const indexCall = mockStorageIndex.mock.calls[0][0];
      expect(indexCall.document.status).toBe('provisional');
    });

    it('sets default values for optional fields', async () => {
      await client.create(baseRequest);

      const indexCall = mockStorageIndex.mock.calls[0][0];
      expect(indexCall.document.access_count).toBe(0);
      expect(indexCall.document.reinforcement_score).toBe(0);
      expect(indexCall.document.salience).toBe(0.5);
      expect(indexCall.document.utility).toBe(0.5);
      expect(indexCall.document.stability).toBe(0.1);
    });

    it('includes space and user info', async () => {
      await client.create(baseRequest);

      const indexCall = mockStorageIndex.mock.calls[0][0];
      expect(indexCall.document.space).toBe('default');
      expect(indexCall.document.user_name).toBe('test-user');
      expect(indexCall.document.user_id).toBe('user-123');
    });
  });

  // ---- update() ------------------------------------------------------------

  describe('update()', () => {
    it('updates specified fields and keeps the rest', async () => {
      // First get() for update validation
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse(['mem-001']));
      // index call
      mockStorageIndex.mockResolvedValue({ result: 'updated' });
      // Second get() after update
      mockStorageSearch.mockResolvedValueOnce(
        makeSearchResponse(['mem-001'], [{ confidence: 0.95 } as any])
      );

      await client.update({ id: 'mem-001', confidence: 0.95 });

      expect(mockStorageIndex).toHaveBeenCalledTimes(1);
      const indexCall = mockStorageIndex.mock.calls[0][0];
      expect(indexCall.document.confidence).toBe(0.95);
      // Other fields preserved
      expect(indexCall.document.type).toBe('semantic');
      expect(indexCall.document.user_name).toBe('test-user');
    });

    it('updates status field', async () => {
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse(['mem-001']));
      mockStorageIndex.mockResolvedValue({ result: 'updated' });
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse(['mem-001']));

      await client.update({ id: 'mem-001', status: 'established' });

      const indexCall = mockStorageIndex.mock.calls[0][0];
      expect(indexCall.document.status).toBe('established');
    });
  });

  // ---- bulkCreate() --------------------------------------------------------

  describe('bulkCreate()', () => {
    it('creates multiple memory nodes in bulk', async () => {
      const reqs: MemoryCreateRequest[] = [
        {
          type: 'semantic',
          summary: 'Memory 1',
          full: 'Full 1',
          confidence: 0.8,
          space: 'default',
          user_name: 'test-user',
        },
        {
          type: 'episodic',
          summary: 'Memory 2',
          full: 'Full 2',
          confidence: 0.7,
          space: 'default',
          user_name: 'test-user',
        },
      ];

      mockStorageBulk.mockResolvedValue({ items: [], errors: false });
      // Two get() calls after bulk create
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse(['id-1']));
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse(['id-2']));

      const result = await client.bulkCreate(reqs);

      expect(mockStorageBulk).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });

    it('returns empty array for empty input', async () => {
      const result = await client.bulkCreate([]);

      expect(mockStorageBulk).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });
  });

  // ---- delete() ------------------------------------------------------------

  describe('delete()', () => {
    it('deletes a memory node by id', async () => {
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse(['mem-001']));
      mockStorageDelete.mockResolvedValue({ result: 'deleted', acknowledged: true });

      const result = await client.delete('mem-001');

      expect(mockStorageDelete).toHaveBeenCalledWith({ id: 'mem-001' });
      expect(result).toBe(true);
    });

    it('throws if memory not found', async () => {
      mockStorageSearch.mockResolvedValueOnce({ hits: { hits: [] } });

      await expect(client.delete('nonexistent')).rejects.toThrow(
        'Memory node not found: nonexistent'
      );
    });
  });

  // ---- search() ------------------------------------------------------------

  describe('search()', () => {
    it('performs BM25 search over summary and full fields', async () => {
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse(['mem-001']));

      const result = await client.search('TypeScript preference');

      expect(mockStorageSearch).toHaveBeenCalledTimes(1);
      const searchCall = mockStorageSearch.mock.calls[0][0];
      expect(JSON.stringify(searchCall)).toContain('TypeScript preference');
      expect(result).toHaveLength(1);
    });

    it('filters by default statuses (provisional|established|consolidated)', async () => {
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse([]));

      await client.search('query');

      const searchCall = mockStorageSearch.mock.calls[0][0];
      const queryStr = JSON.stringify(searchCall);
      expect(queryStr).toContain('provisional');
      expect(queryStr).toContain('established');
      expect(queryStr).toContain('consolidated');
    });

    it('filters by user_name to enforce user isolation', async () => {
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse([]));

      await client.search('query');

      const searchCall = mockStorageSearch.mock.calls[0][0];
      const queryStr = JSON.stringify(searchCall);
      expect(queryStr).toContain('test-user');
    });
  });

  // ---- addLink() -----------------------------------------------------------

  describe('addLink()', () => {
    it('adds a link to a memory node', async () => {
      // addLink calls: get(fromId), then update(fromId) which calls get(fromId) then index() then get(fromId)
      // For non-symmetric edge type 'applies_to', no reverse link is added
      mockStorageSearch
        .mockResolvedValueOnce(makeSearchResponse(['mem-001'])) // get() in addLink
        .mockResolvedValueOnce(makeSearchResponse(['mem-001'])) // get() inside update() before index
        .mockResolvedValueOnce(makeSearchResponse(['mem-001'])); // get() inside update() for return
      mockStorageIndex.mockResolvedValue({ result: 'updated' });

      await client.addLink('mem-001', { target_id: 'mem-002', type: 'applies_to', weight: 0.7 });

      const indexCall = mockStorageIndex.mock.calls[0][0];
      expect(JSON.stringify(indexCall.document.links)).toContain('mem-002');
    });

    it('adds reverse link for symmetric edge types', async () => {
      // addLink(mem-001, related_to, mem-002):
      //   1. get(mem-001) -> search
      //   2. update(mem-001) -> get(mem-001) -> search, index(), get(mem-001) -> search
      //   3. symmetric: get(mem-002) -> search
      //   4. update(mem-002) -> get(mem-002) -> search, index(), get(mem-002) -> search
      mockStorageSearch
        .mockResolvedValueOnce(makeSearchResponse(['mem-001'])) // addLink: get(mem-001)
        .mockResolvedValueOnce(makeSearchResponse(['mem-001'])) // update(mem-001): get before index
        .mockResolvedValueOnce(makeSearchResponse(['mem-001'])) // update(mem-001): get for return
        .mockResolvedValueOnce(makeSearchResponse(['mem-002'])) // symmetric: get(mem-002)
        .mockResolvedValueOnce(makeSearchResponse(['mem-002'])) // update(mem-002): get before index
        .mockResolvedValueOnce(makeSearchResponse(['mem-002'])); // update(mem-002): get for return
      mockStorageIndex.mockResolvedValue({ result: 'updated' });

      await client.addLink('mem-001', { target_id: 'mem-002', type: 'related_to', weight: 0.7 });

      // Two index calls: one for mem-001, one for symmetric reverse on mem-002
      expect(mockStorageIndex).toHaveBeenCalledTimes(2);
    });

    it('throws when node already has MAX_LINKS_PER_NODE links', async () => {
      const lotsOfLinks = Array.from({ length: 50 }, (_, i) => ({
        target_id: `mem-${i + 100}`,
        type: 'related_to' as const,
        weight: 0.5,
      }));
      mockStorageSearch.mockResolvedValueOnce(
        makeSearchResponse(['mem-001'], [{ links: lotsOfLinks } as any])
      );

      await expect(
        client.addLink('mem-001', { target_id: 'mem-999', type: 'applies_to', weight: 0.5 })
      ).rejects.toThrow('50 links (maximum)');
    });
  });

  // ---- removeLink() --------------------------------------------------------

  describe('removeLink()', () => {
    it('removes a link from a memory node', async () => {
      const existingLinks = [{ target_id: 'mem-002', type: 'applies_to' as const, weight: 0.7 }];
      // removeLink: get(mem-001), then update(mem-001): get(mem-001), index(), get(mem-001)
      // 'applies_to' is not symmetric, so no reverse link removal
      mockStorageSearch
        .mockResolvedValueOnce(makeSearchResponse(['mem-001'], [{ links: existingLinks } as any])) // removeLink: get()
        .mockResolvedValueOnce(makeSearchResponse(['mem-001'], [{ links: existingLinks } as any])) // update: get before index
        .mockResolvedValueOnce(makeSearchResponse(['mem-001'])); // update: get for return
      mockStorageIndex.mockResolvedValue({ result: 'updated' });

      await client.removeLink('mem-001', 'mem-002');

      const indexCall = mockStorageIndex.mock.calls[0][0];
      expect(indexCall.document.links).toHaveLength(0);
    });
  });

  // ---- Space isolation verification ----------------------------------------

  describe('space isolation', () => {
    it('includes space filter in list() queries', async () => {
      const spacedClient = createMemoryClient({
        esClient: mockEsClient,
        space: 'my-space',
        userName: 'test-user',
        logger: mockLogger,
      });

      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse([]));
      await spacedClient.list();

      const searchCall = mockStorageSearch.mock.calls[0][0];
      const queryStr = JSON.stringify(searchCall);
      // The space filter should reference 'my-space'
      expect(queryStr).toContain('my-space');
    });

    it('includes user_name filter in list() queries', async () => {
      mockStorageSearch.mockResolvedValueOnce(makeSearchResponse([]));
      await client.list();

      const searchCall = mockStorageSearch.mock.calls[0][0];
      const queryStr = JSON.stringify(searchCall);
      expect(queryStr).toContain('test-user');
    });
  });
});
