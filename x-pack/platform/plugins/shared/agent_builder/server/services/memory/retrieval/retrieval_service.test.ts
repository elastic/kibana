/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryNode } from '@kbn/agent-builder-common';
import { RetrievalService, getTokenBudgetForStage } from './retrieval_service';
import type { EmbeddingService } from '../embeddings';
import type { Logger } from '@kbn/logging';

// ---------------------------------------------------------------------------
// Helpers & mocks
// ---------------------------------------------------------------------------

const makeNode = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
  id: 'test-id-001',
  type: 'semantic',
  summary: 'User prefers TypeScript.',
  full: 'The user has repeatedly expressed preference for TypeScript.',
  confidence: 0.9,
  salience: 0.7,
  recency: new Date().toISOString(),
  utility: 0.8,
  stability: 0.5,
  access_count: 5,
  reinforcement_score: 0.6,
  status: 'established',
  source_refs: [],
  links: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  space: 'default',
  user_name: 'testuser',
  ...overrides,
});

const buildEsHit = (node: MemoryNode, score = 1.0) => ({
  _id: node.id,
  _score: score,
  _source: {
    type: node.type,
    summary: node.summary,
    full: node.full,
    confidence: node.confidence,
    salience: node.salience,
    recency: node.recency,
    utility: node.utility,
    stability: node.stability,
    access_count: node.access_count,
    reinforcement_score: node.reinforcement_score,
    status: node.status,
    source_refs: node.source_refs,
    links: node.links,
    created_at: node.created_at,
    updated_at: node.updated_at,
    space: node.space,
    user_name: node.user_name,
  },
});

const makeMockEsClient = (hits: Array<ReturnType<typeof buildEsHit>>, maxScore = 1.0): any => ({
  search: jest.fn().mockResolvedValue({
    hits: {
      hits,
      max_score: maxScore,
    },
  }),
});

const makeMockEmbeddingService = (
  available: boolean,
  embedding: number[] = []
): jest.Mocked<EmbeddingService> =>
  ({
    isAvailable: jest.fn().mockReturnValue(available),
    embed: jest.fn().mockResolvedValue(embedding),
    batchEmbed: jest.fn().mockResolvedValue([embedding]),
  } as unknown as jest.Mocked<EmbeddingService>);

const makeMockLogger = (): jest.Mocked<Logger> =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    get: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<Logger>);

// ---------------------------------------------------------------------------
// Token budget tests
// ---------------------------------------------------------------------------

describe('getTokenBudgetForStage', () => {
  it('round_start: 2000 tokens', () => {
    expect(getTokenBudgetForStage('round_start')).toBe(2000);
  });

  it('tool_checkpoint: 500 tokens', () => {
    expect(getTokenBudgetForStage('tool_checkpoint')).toBe(500);
  });

  it('final_answer: 1000 tokens', () => {
    expect(getTokenBudgetForStage('final_answer')).toBe(1000);
  });

  it('memory_expand: 300 tokens', () => {
    expect(getTokenBudgetForStage('memory_expand')).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// RetrievalService.retrieve
// ---------------------------------------------------------------------------

describe('RetrievalService.retrieve', () => {
  const defaultOpts = {
    query: 'TypeScript preferences',
    stage: 'round_start' as const,
    space: 'default',
    userName: 'testuser',
  };

  it('returns scored memory nodes from BM25 search', async () => {
    const node = makeNode({ id: 'n1' });
    const esClient = makeMockEsClient([buildEsHit(node, 1.5)], 1.5);
    const embeddingService = makeMockEmbeddingService(false);
    const logger = makeMockLogger();

    const service = new RetrievalService({ esClient, embeddingService, logger });
    const results = await service.retrieve(defaultOpts);

    expect(results).toHaveLength(1);
    expect(results[0].node.id).toBe('n1');
    expect(esClient.search).toHaveBeenCalledTimes(1);
  });

  it('deduplicates nodes from BM25 and kNN (keeps higher relevance)', async () => {
    const node = makeNode({ id: 'shared-node' });
    const bm25Hit = buildEsHit(node, 0.8);
    const knnHit = buildEsHit(node, 0.95);

    const esClient: any = {
      search: jest
        .fn()
        .mockResolvedValueOnce({ hits: { hits: [bm25Hit], max_score: 0.8 } }) // BM25
        .mockResolvedValueOnce({ hits: { hits: [knnHit], max_score: 0.95 } }), // kNN
    };
    const embeddingService = makeMockEmbeddingService(true, [0.1, 0.2, 0.3]);
    const logger = makeMockLogger();

    const service = new RetrievalService({ esClient, embeddingService, logger });
    const results = await service.retrieve(defaultOpts);

    // Should only have 1 result (deduplicated)
    expect(results).toHaveLength(1);
    // Relevance should be the higher of the two
    expect(results[0].relevanceScore).toBeGreaterThanOrEqual(0.8);
  });

  it('falls back to BM25-only when embedding service is unavailable', async () => {
    const node = makeNode({ id: 'n1' });
    const esClient = makeMockEsClient([buildEsHit(node)]);
    const embeddingService = makeMockEmbeddingService(false);
    const logger = makeMockLogger();

    const service = new RetrievalService({ esClient, embeddingService, logger });
    await service.retrieve(defaultOpts);

    // Only BM25 search called
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(embeddingService.embed).not.toHaveBeenCalled();
  });

  it('returns empty array when no results', async () => {
    const esClient = makeMockEsClient([]);
    const embeddingService = makeMockEmbeddingService(false);
    const logger = makeMockLogger();

    const service = new RetrievalService({ esClient, embeddingService, logger });
    const results = await service.retrieve(defaultOpts);

    expect(results).toEqual([]);
  });

  it('enforces maxResults limit', async () => {
    const nodes = Array.from({ length: 15 }, (_, i) =>
      buildEsHit(
        makeNode({ id: `n${i}`, summary: `Memory number ${i} with unique content here.` }),
        1.0
      )
    );
    const esClient = makeMockEsClient(nodes, 1.0);
    const embeddingService = makeMockEmbeddingService(false);
    const logger = makeMockLogger();

    const service = new RetrievalService({ esClient, embeddingService, logger });
    const results = await service.retrieve({ ...defaultOpts, maxResults: 5 });

    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('enforces token budget — skips nodes that exceed budget', async () => {
    // Summary of ~100 chars ≈ 25 tokens. With budget=50 tokens, should fit ~2 nodes.
    const longSummary = 'A'.repeat(100); // 100 chars ≈ 25 tokens
    const nodes = Array.from({ length: 5 }, (_, i) =>
      buildEsHit(makeNode({ id: `n${i}`, summary: longSummary }), 1.0)
    );
    const esClient = makeMockEsClient(nodes, 1.0);
    const embeddingService = makeMockEmbeddingService(false);
    const logger = makeMockLogger();

    const service = new RetrievalService({ esClient, embeddingService, logger });
    const results = await service.retrieve({
      ...defaultOpts,
      tokenBudget: 50, // ~50 tokens total → fits 2 nodes with 25-token summaries
    });

    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('handles ES search failure gracefully (returns empty)', async () => {
    const esClient: any = {
      search: jest.fn().mockRejectedValue(new Error('ES unavailable')),
    };
    const embeddingService = makeMockEmbeddingService(false);
    const logger = makeMockLogger();

    const service = new RetrievalService({ esClient, embeddingService, logger });
    const results = await service.retrieve(defaultOpts);

    expect(results).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('ranks higher-utility nodes before lower-utility ones', async () => {
    const lowUtility = buildEsHit(
      makeNode({ id: 'low', utility: 0.1, summary: 'Low utility memory.' }),
      0.5
    );
    const highUtility = buildEsHit(
      makeNode({ id: 'high', utility: 0.9, summary: 'High utility memory.' }),
      0.5
    );

    const esClient = makeMockEsClient([lowUtility, highUtility], 0.5);
    const embeddingService = makeMockEmbeddingService(false);
    const logger = makeMockLogger();

    const service = new RetrievalService({ esClient, embeddingService, logger });
    const results = await service.retrieve(defaultOpts);

    // High utility should rank higher
    const highIdx = results.findIndex((r) => r.node.id === 'high');
    const lowIdx = results.findIndex((r) => r.node.id === 'low');
    expect(highIdx).toBeLessThan(lowIdx);
  });
});

// ---------------------------------------------------------------------------
// RetrievalService.toMemoryBundle
// ---------------------------------------------------------------------------

describe('RetrievalService.toMemoryBundle', () => {
  const esClient = makeMockEsClient([]);
  const embeddingService = makeMockEmbeddingService(false);
  const logger = makeMockLogger();
  const service = new RetrievalService({ esClient, embeddingService, logger });

  it('returns empty string for empty input', () => {
    expect(service.toMemoryBundle([], 'round_start')).toBe('');
  });

  it('includes ## Active Memories header', () => {
    const node = makeNode({ id: 'test-node-id', type: 'semantic', confidence: 0.9 });
    const result = service.toMemoryBundle(
      [{ node, score: 1.0, relevanceScore: 0.8, graphProximityBonus: 0 }],
      'round_start'
    );
    expect(result).toContain('## Active Memories');
  });

  it('formats each memory with id prefix, type, summary, and confidence', () => {
    const node = makeNode({
      id: 'abcdef1234567',
      type: 'semantic',
      summary: 'User prefers TypeScript.',
      confidence: 0.9,
    });
    const result = service.toMemoryBundle(
      [{ node, score: 1.0, relevanceScore: 0.8, graphProximityBonus: 0 }],
      'round_start'
    );
    expect(result).toContain('[abcdef1]');
    expect(result).toContain('(semantic)');
    expect(result).toContain('User prefers TypeScript.');
    expect(result).toContain('[confidence: 0.9]');
  });

  it('includes all nodes in the bundle', () => {
    const nodes = [
      {
        node: makeNode({ id: 'node1', summary: 'First memory.' }),
        score: 1.0,
        relevanceScore: 0.9,
        graphProximityBonus: 0,
      },
      {
        node: makeNode({ id: 'node2', summary: 'Second memory.' }),
        score: 0.8,
        relevanceScore: 0.7,
        graphProximityBonus: 0,
      },
    ];
    const result = service.toMemoryBundle(nodes, 'round_start');
    expect(result).toContain('First memory.');
    expect(result).toContain('Second memory.');
  });
});
