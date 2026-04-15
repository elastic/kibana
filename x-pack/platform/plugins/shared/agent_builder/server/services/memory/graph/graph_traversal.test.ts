/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryNode, MemoryLink } from '@kbn/agent-builder-common';
import { GraphTraversalService } from './graph_traversal';
import { ContradictionDetector } from './contradiction_detector';
import type { MemoryClient } from '../client';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const makeNode = (
  id: string,
  links: MemoryLink[] = [],
  overrides: Partial<MemoryNode> = {}
): MemoryNode => ({
  id,
  type: 'semantic',
  summary: `Summary of ${id}`,
  full: `Full content of ${id}`,
  confidence: 0.8,
  salience: 0.5,
  recency: '2024-01-01T00:00:00.000Z',
  utility: 0.5,
  stability: 0.1,
  access_count: 0,
  reinforcement_score: 0,
  status: 'established',
  source_refs: [],
  links,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  space: 'default',
  user_name: 'test-user',
  ...overrides,
});

const makeLink = (
  targetId: string,
  weight: number = 0.7,
  type: MemoryLink['type'] = 'related_to'
): MemoryLink => ({ target_id: targetId, type, weight });

// ---------------------------------------------------------------------------
// Mock MemoryClient
// ---------------------------------------------------------------------------

const makeMockClient = (nodeMap: Map<string, MemoryNode>): jest.Mocked<MemoryClient> => {
  const mockGet = jest.fn(async (id: string) => {
    const node = nodeMap.get(id);
    if (!node) {
      throw new Error(`Memory node not found: ${id}`);
    }
    return node;
  });

  const mockUpdate = jest.fn(async (req: { id: string; [key: string]: unknown }) => {
    const node = nodeMap.get(req.id);
    if (!node) {
      throw new Error(`Memory node not found: ${req.id}`);
    }
    // Apply update to the in-memory map for test assertions
    const updated = { ...node, ...req };
    nodeMap.set(req.id, updated as MemoryNode);
    return updated as MemoryNode;
  });

  const mockList = jest.fn(async (opts: { status?: string | string[]; size?: number } = {}) => {
    let nodes = Array.from(nodeMap.values());
    if (opts.status) {
      const statuses = Array.isArray(opts.status) ? opts.status : [opts.status];
      nodes = nodes.filter((n) => statuses.includes(n.status));
    }
    if (opts.size !== undefined) {
      nodes = nodes.slice(0, opts.size);
    }
    return nodes;
  });

  return {
    get: mockGet,
    update: mockUpdate,
    list: mockList,
    create: jest.fn(),
    bulkCreate: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    addLink: jest.fn(),
    removeLink: jest.fn(),
    updateLinkWeight: jest.fn(),
  } as unknown as jest.Mocked<MemoryClient>;
};

const makeMockLogger = () => ({
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
});

// ===========================================================================
// GraphTraversalService Tests
// ===========================================================================

describe('GraphTraversalService', () => {
  describe('getNeighbors()', () => {
    it('returns direct neighbors at depth 1', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        ['root', makeNode('root', [makeLink('child1', 0.9), makeLink('child2', 0.6)])],
        ['child1', makeNode('child1')],
        ['child2', makeNode('child2')],
      ]);

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const neighbors = await service.getNeighbors('root', { depth: 1 });

      expect(neighbors).toHaveLength(2);
      // Results sorted by weight desc: child1 (0.9) before child2 (0.6)
      expect(neighbors[0].id).toBe('child1');
      expect(neighbors[1].id).toBe('child2');
    });

    it('traverses up to the configured depth', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        ['root', makeNode('root', [makeLink('level1', 0.9)])],
        ['level1', makeNode('level1', [makeLink('level2', 0.8)])],
        ['level2', makeNode('level2', [makeLink('level3', 0.7)])],
        ['level3', makeNode('level3')],
      ]);

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      // depth=2 should return level1 and level2, NOT level3
      const neighbors = await service.getNeighbors('root', { depth: 2 });

      expect(neighbors.map((n) => n.id)).toEqual(['level1', 'level2']);
    });

    it('prevents cycles', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        ['a', makeNode('a', [makeLink('b', 0.9)])],
        ['b', makeNode('b', [makeLink('c', 0.8)])],
        ['c', makeNode('c', [makeLink('a', 0.7)])], // cycle back to 'a'
      ]);

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      // Should not loop infinitely — returns b and c only (a is the root, already visited)
      const neighbors = await service.getNeighbors('a', { depth: 5 });

      const ids = neighbors.map((n) => n.id);
      // 'a' must not appear in results (it is the root, already visited)
      expect(ids).not.toContain('a');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
    });

    it('filters by edge type', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        [
          'root',
          makeNode('root', [
            makeLink('related', 0.9, 'related_to'),
            makeLink('derived', 0.8, 'derived_from'),
            makeLink('contradicts', 0.7, 'contradicts'),
          ]),
        ],
        ['related', makeNode('related')],
        ['derived', makeNode('derived')],
        ['contradicts', makeNode('contradicts')],
      ]);

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const neighbors = await service.getNeighbors('root', {
        depth: 1,
        edgeTypes: ['related_to'],
      });

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe('related');
    });

    it('caps results at maxResults', async () => {
      const links = Array.from({ length: 15 }, (_, i) => makeLink(`child${i}`, 0.5));
      const childNodes = Array.from({ length: 15 }, (_, i) =>
        makeNode(`child${i}`)
      );
      const nodeMap = new Map<string, MemoryNode>([
        ['root', makeNode('root', links)],
        ...childNodes.map((n) => [n.id, n] as [string, MemoryNode]),
      ]);

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const neighbors = await service.getNeighbors('root', { depth: 1, maxResults: 5 });

      expect(neighbors).toHaveLength(5);
    });

    it('returns compact nodes (empty full field) by default', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        ['root', makeNode('root', [makeLink('child', 0.9)])],
        ['child', makeNode('child')],
      ]);

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const neighbors = await service.getNeighbors('root', { depth: 1, includeFull: false });

      expect(neighbors[0].full).toBe('');
    });

    it('returns full content when includeFull=true', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        ['root', makeNode('root', [makeLink('child', 0.9)])],
        ['child', makeNode('child')],
      ]);

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const neighbors = await service.getNeighbors('root', { depth: 1, includeFull: true });

      expect(neighbors[0].full).toBe('Full content of child');
    });

    it('applies access bump to visited nodes', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        ['root', makeNode('root', [makeLink('child', 0.9)])],
        ['child', makeNode('child', [], { access_count: 3, reinforcement_score: 0.1 })],
      ]);
      const client = makeMockClient(nodeMap);

      const service = new GraphTraversalService({
        client,
        logger: makeMockLogger() as any,
      });

      await service.getNeighbors('root', { depth: 1 });

      // Allow the best-effort access bump to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'child',
          access_count: 4,
        })
      );
    });

    it('returns empty array if root node does not exist', async () => {
      const nodeMap = new Map<string, MemoryNode>();
      const logger = makeMockLogger();

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: logger as any,
      });

      const neighbors = await service.getNeighbors('nonexistent', { depth: 1 });

      expect(neighbors).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('skips unreachable neighbor nodes and continues', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        [
          'root',
          makeNode('root', [
            makeLink('missing', 0.9),
            makeLink('present', 0.8),
          ]),
        ],
        // 'missing' is intentionally not in the map
        ['present', makeNode('present')],
      ]);
      const logger = makeMockLogger();

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: logger as any,
      });

      const neighbors = await service.getNeighbors('root', { depth: 1 });

      // Should still return 'present' despite 'missing' throwing
      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe('present');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getSubgraph()
  // -------------------------------------------------------------------------

  describe('getSubgraph()', () => {
    it('includes the root node in the result', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        ['root', makeNode('root', [makeLink('child', 0.9)])],
        ['child', makeNode('child')],
      ]);

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const { nodes } = await service.getSubgraph('root', 1);

      const ids = nodes.map((n) => n.id);
      expect(ids).toContain('root');
      expect(ids).toContain('child');
    });

    it('includes edges in the result', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        ['root', makeNode('root', [makeLink('child', 0.9, 'related_to')])],
        ['child', makeNode('child')],
      ]);

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const { edges } = await service.getSubgraph('root', 1);

      expect(edges).toHaveLength(1);
      expect(edges[0]).toMatchObject({
        from_id: 'root',
        to_id: 'child',
        type: 'related_to',
        weight: 0.9,
      });
    });

    it('prevents cycles in subgraph traversal', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        ['a', makeNode('a', [makeLink('b', 0.9)])],
        ['b', makeNode('b', [makeLink('a', 0.8)])], // cycle
      ]);

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const { nodes, edges } = await service.getSubgraph('a', 5);

      // Only 2 unique nodes, not infinite
      expect(nodes.map((n) => n.id)).toEqual(expect.arrayContaining(['a', 'b']));
      expect(nodes.length).toBe(2);
      // edge a->b exists, edge b->a exists
      expect(edges.length).toBe(2);
    });

    it('filters edges by edge type', async () => {
      const nodeMap = new Map<string, MemoryNode>([
        [
          'root',
          makeNode('root', [
            makeLink('rel', 0.9, 'related_to'),
            makeLink('der', 0.8, 'derived_from'),
          ]),
        ],
        ['rel', makeNode('rel')],
        ['der', makeNode('der')],
      ]);

      const service = new GraphTraversalService({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const { nodes, edges } = await service.getSubgraph('root', 1, ['related_to']);

      expect(nodes.map((n) => n.id)).toContain('rel');
      expect(nodes.map((n) => n.id)).not.toContain('der');
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('related_to');
    });
  });
});

// ===========================================================================
// ContradictionDetector Tests
// ===========================================================================

describe('ContradictionDetector', () => {
  describe('detect()', () => {
    it('returns empty array for empty candidates input', async () => {
      const nodeMap = new Map<string, MemoryNode>();
      const detector = new ContradictionDetector({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const result = await detector.detect([]);
      expect(result).toHaveLength(0);
    });

    it('detects explicit contradicts edge from candidate to established', async () => {
      const established = makeNode('est-1', [], { status: 'established' });
      const candidate = makeNode(
        'cand-1',
        [{ target_id: 'est-1', type: 'contradicts', weight: 0.9 }],
        { status: 'candidate' }
      );

      const nodeMap = new Map<string, MemoryNode>([
        ['est-1', established],
        ['cand-1', candidate],
      ]);

      const detector = new ContradictionDetector({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const conflicts = await detector.detect([candidate]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].candidate.id).toBe('cand-1');
      expect(conflicts[0].established.id).toBe('est-1');
      expect(conflicts[0].reason).toBe('explicit_edge');
    });

    it('detects explicit contradicts edge from established to candidate', async () => {
      const candidate = makeNode('cand-1', [], { status: 'candidate' });
      const established = makeNode(
        'est-1',
        [{ target_id: 'cand-1', type: 'contradicts', weight: 0.9 }],
        { status: 'established' }
      );

      const nodeMap = new Map<string, MemoryNode>([
        ['est-1', established],
        ['cand-1', candidate],
      ]);

      const detector = new ContradictionDetector({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const conflicts = await detector.detect([candidate]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].reason).toBe('explicit_edge');
    });

    it('does not flag non-contradicts edges', async () => {
      const established = makeNode('est-1', [], { status: 'established' });
      // related_to link — should NOT be flagged
      const candidate = makeNode(
        'cand-1',
        [{ target_id: 'est-1', type: 'related_to', weight: 0.9 }],
        { status: 'candidate' }
      );

      const nodeMap = new Map<string, MemoryNode>([
        ['est-1', established],
        ['cand-1', candidate],
      ]);

      const detector = new ContradictionDetector({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const conflicts = await detector.detect([candidate]);
      expect(conflicts).toHaveLength(0);
    });

    it('does not compare a node against itself', async () => {
      // The same node appears as both candidate and in the established list
      const node = makeNode('node-1', [], { status: 'established' });
      const nodeMap = new Map<string, MemoryNode>([['node-1', node]]);

      const detector = new ContradictionDetector({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      // Pass it as a candidate even though it's established
      const conflicts = await detector.detect([node]);
      expect(conflicts).toHaveLength(0);
    });

    it('handles multiple candidates and multiple established nodes', async () => {
      const est1 = makeNode('est-1', [], { status: 'established' });
      const est2 = makeNode('est-2', [], { status: 'established' });
      const cand1 = makeNode(
        'cand-1',
        [{ target_id: 'est-1', type: 'contradicts', weight: 0.9 }],
        { status: 'candidate' }
      );
      const cand2 = makeNode(
        'cand-2',
        [{ target_id: 'est-2', type: 'contradicts', weight: 0.8 }],
        { status: 'candidate' }
      );

      const nodeMap = new Map<string, MemoryNode>([
        ['est-1', est1],
        ['est-2', est2],
        ['cand-1', cand1],
        ['cand-2', cand2],
      ]);

      const detector = new ContradictionDetector({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const conflicts = await detector.detect([cand1, cand2]);

      expect(conflicts).toHaveLength(2);
      const pairs = conflicts.map((c) => `${c.candidate.id}:${c.established.id}`);
      expect(pairs).toContain('cand-1:est-1');
      expect(pairs).toContain('cand-2:est-2');
    });

    it('returns empty array when there are no established nodes', async () => {
      const candidate = makeNode('cand-1', [], { status: 'candidate' });
      // No established nodes in the map
      const nodeMap = new Map<string, MemoryNode>([['cand-1', candidate]]);

      const detector = new ContradictionDetector({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
      });

      const conflicts = await detector.detect([candidate]);
      expect(conflicts).toHaveLength(0);
    });

    it('returns empty array and logs a warning when list() fails', async () => {
      const candidate = makeNode('cand-1', [], { status: 'candidate' });
      const nodeMap = new Map<string, MemoryNode>([['cand-1', candidate]]);
      const client = makeMockClient(nodeMap);
      (client.list as jest.Mock).mockRejectedValueOnce(new Error('ES error'));

      const logger = makeMockLogger();
      const detector = new ContradictionDetector({
        client,
        logger: logger as any,
      });

      const conflicts = await detector.detect([candidate]);
      expect(conflicts).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('respects custom establishedStatuses config', async () => {
      // Only 'consolidated' nodes should be scanned
      const consolidated = makeNode('cons-1', [], { status: 'consolidated' });
      const established = makeNode('est-1', [], { status: 'established' });
      const candidate = makeNode(
        'cand-1',
        [
          { target_id: 'cons-1', type: 'contradicts', weight: 0.9 },
          { target_id: 'est-1', type: 'contradicts', weight: 0.9 },
        ],
        { status: 'candidate' }
      );

      const nodeMap = new Map<string, MemoryNode>([
        ['cons-1', consolidated],
        ['est-1', established],
        ['cand-1', candidate],
      ]);

      const detector = new ContradictionDetector({
        client: makeMockClient(nodeMap),
        logger: makeMockLogger() as any,
        config: { establishedStatuses: ['consolidated'] },
      });

      const conflicts = await detector.detect([candidate]);

      // Only consolidated nodes scanned, so only 'cons-1' should appear
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].established.id).toBe('cons-1');
    });
  });
});
