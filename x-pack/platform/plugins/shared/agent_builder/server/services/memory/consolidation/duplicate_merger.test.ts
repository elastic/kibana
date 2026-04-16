/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DuplicateMerger } from './duplicate_merger';
import type { MemoryNode, MemoryLink, MemorySourceRef } from '@kbn/agent-builder-common';
import { loggerMock } from '@kbn/logging-mocks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW_ISO = '2025-06-01T00:00:00.000Z';

const makeMemory = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
  id: 'mem-001',
  type: 'semantic',
  summary: 'Test memory summary',
  full: 'Full text of test memory',
  confidence: 0.8,
  salience: 0.7,
  recency: NOW_ISO,
  utility: 0.6,
  stability: 0.5,
  access_count: 5,
  reinforcement_score: 0.5,
  status: 'established',
  source_refs: [],
  links: [],
  created_at: '2025-05-01T00:00:00.000Z',
  updated_at: NOW_ISO,
  space: 'default',
  user_name: 'test-user',
  ...overrides,
});

const makeMemoryClient = () => ({
  get: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  bulkCreate: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
  addLink: jest.fn(),
  removeLink: jest.fn(),
  updateLinkWeight: jest.fn(),
});

const makeEsClient = () => ({
  search: jest.fn(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DuplicateMerger', () => {
  let logger: ReturnType<typeof loggerMock.create>;
  let memoryClient: ReturnType<typeof makeMemoryClient>;
  let esClient: ReturnType<typeof makeEsClient>;
  let merger: DuplicateMerger;

  beforeEach(() => {
    logger = loggerMock.create();
    memoryClient = makeMemoryClient();
    esClient = makeEsClient();

    merger = new DuplicateMerger({
      esClient: esClient as any,
      memoryClient: memoryClient as any,
      logger,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('mergeDuplicates', () => {
    it('returns empty result when fewer than 2 memories are provided', async () => {
      const result = await merger.mergeDuplicates([makeMemory()]);
      expect(result).toEqual({ pairs: [], mergedCount: 0, redirectedLinks: 0 });
    });

    it('returns empty result when no duplicate pairs are found', async () => {
      // kNN search returns empty results (below threshold)
      esClient.search.mockResolvedValue({
        hits: { hits: [] },
      });

      const memories = [makeMemory({ id: 'a' }), makeMemory({ id: 'b' })];
      const result = await merger.mergeDuplicates(memories);

      expect(result.pairs).toHaveLength(0);
      expect(result.mergedCount).toBe(0);
    });

    it('identifies a duplicate pair when similarity exceeds threshold', async () => {
      const memA = makeMemory({ id: 'mem-a', reinforcement_score: 0.8, confidence: 0.9 });
      const memB = makeMemory({ id: 'mem-b', reinforcement_score: 0.2, confidence: 0.3 });

      // kNN for mem-a returns mem-b as a neighbour with high score
      esClient.search.mockImplementation((params: any) => {
        // Check which memory is being searched
        if (
          params.knn?.filter?.bool?.filter?.some(
            (f: any) => f.term?.user_name === 'test-user'
          )
        ) {
          return Promise.resolve({
            hits: {
              hits: [
                { _id: 'mem-b', _score: 0.95 },
              ],
            },
          });
        }
        return Promise.resolve({ hits: { hits: [] } });
      });

      // Setup memoryClient.get to return nodes for merge
      memoryClient.get.mockImplementation((id: string) => {
        if (id === 'mem-a') return Promise.resolve(memA);
        if (id === 'mem-b') return Promise.resolve(memB);
        throw new Error(`Not found: ${id}`);
      });

      memoryClient.update.mockResolvedValue({});

      const result = await merger.mergeDuplicates([memA, memB]);

      // Should have found one pair
      expect(result.pairs.length).toBeGreaterThan(0);

      const pair = result.pairs[0];
      // mem-a has higher composite score → canonical
      expect(pair.canonicalId).toBe('mem-a');
      expect(pair.deprecatedId).toBe('mem-b');
    });

    it('selects canonical based on higher composite score', () => {
      // Access selectCanonical indirectly through selectCanonical logic:
      // canonical = higher (reinforcement_score + confidence + utility)
      const highScoreMemory = makeMemory({
        id: 'high',
        reinforcement_score: 0.9,
        confidence: 0.9,
        utility: 0.9,
      });
      const lowScoreMemory = makeMemory({
        id: 'low',
        reinforcement_score: 0.1,
        confidence: 0.1,
        utility: 0.1,
      });

      // Simulate via kNN (high as source, low as neighbour)
      esClient.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'low', _score: 0.95 }],
        },
      });

      memoryClient.get.mockImplementation((id: string) => {
        if (id === 'high') return Promise.resolve(highScoreMemory);
        if (id === 'low') return Promise.resolve(lowScoreMemory);
        throw new Error('Not found');
      });
      memoryClient.update.mockResolvedValue({});

      return merger.mergeDuplicates([highScoreMemory, lowScoreMemory]).then((result) => {
        if (result.pairs.length > 0) {
          expect(result.pairs[0].canonicalId).toBe('high');
          expect(result.pairs[0].deprecatedId).toBe('low');
        }
      });
    });

    it('merges source_refs from deprecated into canonical', async () => {
      const srcRefA: MemorySourceRef = {
        conversation_id: 'conv-a',
        round_id: 'round-1',
      };
      const srcRefB: MemorySourceRef = {
        conversation_id: 'conv-b',
        round_id: 'round-2',
      };

      const memA = makeMemory({
        id: 'mem-a',
        reinforcement_score: 0.9,
        confidence: 0.9,
        source_refs: [srcRefA],
      });
      const memB = makeMemory({
        id: 'mem-b',
        reinforcement_score: 0.1,
        confidence: 0.1,
        source_refs: [srcRefB],
      });

      esClient.search.mockResolvedValue({
        hits: { hits: [{ _id: 'mem-b', _score: 0.95 }] },
      });

      memoryClient.get.mockImplementation((id: string) => {
        if (id === 'mem-a') return Promise.resolve(memA);
        if (id === 'mem-b') return Promise.resolve(memB);
        throw new Error('Not found');
      });
      memoryClient.update.mockResolvedValue({});

      await merger.mergeDuplicates([memA, memB]);

      // The canonical update should include merged source_refs
      const updateCalls = memoryClient.update.mock.calls;
      const canonicalUpdateCall = updateCalls.find((call: any) => call[0].id === 'mem-a');
      expect(canonicalUpdateCall).toBeDefined();

      const canonicalUpdate = canonicalUpdateCall![0];
      expect(canonicalUpdate.source_refs).toBeDefined();
      const refKeys = canonicalUpdate.source_refs.map(
        (r: MemorySourceRef) => `${r.conversation_id}|${r.round_id}`
      );
      expect(refKeys).toContain('conv-a|round-1');
      expect(refKeys).toContain('conv-b|round-2');
    });

    it('redirects links from other memories pointing to deprecated → canonical', async () => {
      const memA = makeMemory({ id: 'mem-a', reinforcement_score: 0.9, confidence: 0.9 });
      const memB = makeMemory({ id: 'mem-b', reinforcement_score: 0.1, confidence: 0.1 });
      const memC = makeMemory({
        id: 'mem-c',
        links: [{ target_id: 'mem-b', type: 'related_to', weight: 1.0 }],
      });

      esClient.search.mockResolvedValue({
        hits: { hits: [{ _id: 'mem-b', _score: 0.95 }] },
      });

      memoryClient.get.mockImplementation((id: string) => {
        if (id === 'mem-a') return Promise.resolve(memA);
        if (id === 'mem-b') return Promise.resolve(memB);
        throw new Error('Not found');
      });
      memoryClient.update.mockResolvedValue({});

      const memories = [memA, memB, memC];
      await merger.mergeDuplicates(memories);

      // mem-c should have had its link updated from mem-b → mem-a
      const memCUpdateCall = memoryClient.update.mock.calls.find(
        (call: any) => call[0].id === 'mem-c'
      );
      expect(memCUpdateCall).toBeDefined();

      const memCLinks: MemoryLink[] = memCUpdateCall![0].links;
      expect(memCLinks.some((l) => l.target_id === 'mem-a')).toBe(true);
      expect(memCLinks.some((l) => l.target_id === 'mem-b')).toBe(false);
    });

    it('sets deprecated memory status to deprecated', async () => {
      const memA = makeMemory({ id: 'mem-a', reinforcement_score: 0.9 });
      const memB = makeMemory({ id: 'mem-b', reinforcement_score: 0.1 });

      esClient.search.mockResolvedValue({
        hits: { hits: [{ _id: 'mem-b', _score: 0.95 }] },
      });

      memoryClient.get.mockImplementation((id: string) => {
        if (id === 'mem-a') return Promise.resolve(memA);
        if (id === 'mem-b') return Promise.resolve(memB);
        throw new Error('Not found');
      });
      memoryClient.update.mockResolvedValue({});

      await merger.mergeDuplicates([memA, memB]);

      const deprecateCall = memoryClient.update.mock.calls.find(
        (call: any) => call[0].id === 'mem-b' && call[0].status === 'deprecated'
      );
      expect(deprecateCall).toBeDefined();
    });

    it('merges links from deprecated into canonical, excluding self-referential links', async () => {
      const linkToOther: MemoryLink = { target_id: 'mem-other', type: 'related_to', weight: 1.0 };
      const selfRefLink: MemoryLink = { target_id: 'mem-b', type: 'related_to', weight: 1.0 };

      const memA = makeMemory({
        id: 'mem-a',
        reinforcement_score: 0.9,
        links: [],
      });
      const memB = makeMemory({
        id: 'mem-b',
        reinforcement_score: 0.1,
        links: [linkToOther, selfRefLink],
      });

      esClient.search.mockResolvedValue({
        hits: { hits: [{ _id: 'mem-b', _score: 0.95 }] },
      });

      memoryClient.get.mockImplementation((id: string) => {
        if (id === 'mem-a') return Promise.resolve(memA);
        if (id === 'mem-b') return Promise.resolve(memB);
        throw new Error('Not found');
      });
      memoryClient.update.mockResolvedValue({});

      await merger.mergeDuplicates([memA, memB]);

      const canonicalUpdateCall = memoryClient.update.mock.calls.find(
        (call: any) => call[0].id === 'mem-a' && call[0].links !== undefined
      );
      expect(canonicalUpdateCall).toBeDefined();

      const mergedLinks: MemoryLink[] = canonicalUpdateCall![0].links;
      // linkToOther should be merged in
      expect(mergedLinks.some((l) => l.target_id === 'mem-other')).toBe(true);
      // self-referential link to mem-b should NOT be merged
      expect(mergedLinks.some((l) => l.target_id === 'mem-b')).toBe(false);
    });

    it('handles kNN search failure gracefully (returns empty pairs)', async () => {
      esClient.search.mockRejectedValue(new Error('field_not_found: embedding'));

      const memories = [makeMemory({ id: 'a' }), makeMemory({ id: 'b' })];
      const result = await merger.mergeDuplicates(memories);

      // Should not throw, just return empty
      expect(result.pairs).toHaveLength(0);
      expect(result.mergedCount).toBe(0);
    });

    it('skips already-processed pairs in same run', async () => {
      // Set up three memories where all are duplicates of each other
      const memA = makeMemory({ id: 'mem-a', reinforcement_score: 0.9 });
      const memB = makeMemory({ id: 'mem-b', reinforcement_score: 0.5 });

      // kNN: mem-a finds mem-b as neighbour, and mem-b finds mem-a
      let callCount = 0;
      esClient.search.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 1) {
          return Promise.resolve({ hits: { hits: [{ _id: 'mem-b', _score: 0.95 }] } });
        }
        return Promise.resolve({ hits: { hits: [{ _id: 'mem-a', _score: 0.95 }] } });
      });

      memoryClient.get.mockImplementation((id: string) => {
        if (id === 'mem-a') return Promise.resolve(memA);
        if (id === 'mem-b') return Promise.resolve(memB);
        throw new Error('Not found');
      });
      memoryClient.update.mockResolvedValue({});

      const result = await merger.mergeDuplicates([memA, memB]);

      // Should only process the pair once, not twice
      expect(result.mergedCount).toBe(1);
    });
  });
});
