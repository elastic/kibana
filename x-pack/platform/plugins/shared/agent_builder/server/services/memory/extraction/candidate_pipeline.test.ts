/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { CandidatePipeline } from './candidate_pipeline';
import type { ExtractionResult } from './memory_extractor';
import type { MemoryClient } from '../client';
import type { MemoryNode, MemoryCreateRequest } from '@kbn/agent-builder-common';
import type { EmbeddingService } from '../embeddings';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ReinforcementSignal } from '../active_memory_set';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeLogger = () => loggerMock.create();

const makeMemoryNode = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
  id: 'mem-001',
  type: 'semantic',
  summary: 'Test memory',
  full: 'Test memory full content',
  confidence: 0.8,
  salience: 0.5,
  recency: new Date().toISOString(),
  utility: 0.5,
  stability: 0.1,
  access_count: 0,
  reinforcement_score: 0,
  status: 'candidate',
  source_refs: [],
  links: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  space: 'default',
  user_name: 'user1',
  ...overrides,
});

const makeMemoryClient = (): jest.Mocked<MemoryClient> => ({
  get: jest.fn().mockResolvedValue(makeMemoryNode()),
  list: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue(makeMemoryNode()),
  update: jest.fn().mockResolvedValue(makeMemoryNode()),
  bulkCreate: jest.fn().mockResolvedValue([makeMemoryNode()]),
  delete: jest.fn().mockResolvedValue(true),
  search: jest.fn().mockResolvedValue([]),
  addLink: jest.fn().mockResolvedValue(undefined),
  removeLink: jest.fn().mockResolvedValue(undefined),
  updateLinkWeight: jest.fn().mockResolvedValue(undefined),
});

const makeNoopEmbeddingService = (): EmbeddingService =>
  ({
    embed: jest.fn().mockResolvedValue([]),
    batchEmbed: jest.fn().mockResolvedValue([[]]),
    isAvailable: jest.fn().mockReturnValue(false),
  }) as unknown as EmbeddingService;

const emptyExtraction: ExtractionResult = {
  semantic: [],
  episodic: [],
  procedural: [],
};

const singleSemanticExtraction: ExtractionResult = {
  semantic: [
    {
      summary: 'User prefers TypeScript',
      full: 'User has shown preference for TypeScript in all projects.',
      subtype: 'user_preference',
      confidence: 0.9,
    },
  ],
  episodic: [],
  procedural: [],
};

const multiTypeExtraction: ExtractionResult = {
  semantic: [
    { summary: 'Semantic fact', full: 'Full semantic content', confidence: 0.85 },
  ],
  episodic: [
    { summary: 'This round user decided X', full: 'Detailed decision', confidence: 0.75 },
  ],
  procedural: [
    { summary: 'Always run linting', full: 'User runs lint before commit', confidence: 0.7 },
  ],
};

const pipelineContext = {
  conversationId: 'conv-001',
  roundId: 'round-001',
  space: 'default',
  userName: 'user1',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CandidatePipeline', () => {
  describe('run', () => {
    it('returns zero counts for empty extraction', async () => {
      const client = makeMemoryClient();
      const pipeline = new CandidatePipeline({
        memoryClient: client,
        esClient: {} as ElasticsearchClient,
        embeddingService: makeNoopEmbeddingService(),
        logger: makeLogger(),
      });

      const result = await pipeline.run(emptyExtraction, pipelineContext, []);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.derived).toBe(0);
      expect(result.errors).toBe(0);
      expect(client.bulkCreate).not.toHaveBeenCalled();
    });

    it('creates candidate memories with status=candidate and stability=0.1', async () => {
      const client = makeMemoryClient();
      client.bulkCreate.mockResolvedValue([makeMemoryNode({ id: 'new-001' })]);

      const pipeline = new CandidatePipeline({
        memoryClient: client,
        esClient: {} as ElasticsearchClient,
        embeddingService: makeNoopEmbeddingService(),
        logger: makeLogger(),
      });

      await pipeline.run(singleSemanticExtraction, pipelineContext, []);

      expect(client.bulkCreate).toHaveBeenCalledTimes(1);
      const calls = client.bulkCreate.mock.calls[0][0] as MemoryCreateRequest[];
      expect(calls).toHaveLength(1);

      const req = calls[0];
      expect(req.status).toBe('candidate');
      expect(req.stability).toBe(0.1);
      expect(req.confidence).toBe(0.9);
      expect(req.type).toBe('semantic');
    });

    it('sets source_refs with conversation_id and round_id', async () => {
      const client = makeMemoryClient();
      client.bulkCreate.mockResolvedValue([makeMemoryNode()]);

      const pipeline = new CandidatePipeline({
        memoryClient: client,
        esClient: {} as ElasticsearchClient,
        embeddingService: makeNoopEmbeddingService(),
        logger: makeLogger(),
      });

      await pipeline.run(singleSemanticExtraction, pipelineContext, []);

      const calls = client.bulkCreate.mock.calls[0][0] as MemoryCreateRequest[];
      const req = calls[0];

      expect(req.source_refs).toHaveLength(1);
      expect(req.source_refs![0].conversation_id).toBe('conv-001');
      expect(req.source_refs![0].round_id).toBe('round-001');
    });

    it('creates memories of all three types', async () => {
      const client = makeMemoryClient();
      client.bulkCreate.mockResolvedValue([
        makeMemoryNode({ id: 'sem-001', type: 'semantic' }),
        makeMemoryNode({ id: 'epi-001', type: 'episodic' }),
        makeMemoryNode({ id: 'pro-001', type: 'procedural' }),
      ]);

      const pipeline = new CandidatePipeline({
        memoryClient: client,
        esClient: {} as ElasticsearchClient,
        embeddingService: makeNoopEmbeddingService(),
        logger: makeLogger(),
      });

      await pipeline.run(multiTypeExtraction, pipelineContext, []);

      const calls = client.bulkCreate.mock.calls[0][0] as MemoryCreateRequest[];
      const types = calls.map((c) => c.type);
      expect(types).toContain('semantic');
      expect(types).toContain('episodic');
      expect(types).toContain('procedural');
    });

    it('adds suggested links for semantic memories with suggested_links', async () => {
      const extractionWithLinks: ExtractionResult = {
        semantic: [
          {
            summary: 'Related semantic',
            full: 'Full content',
            confidence: 0.8,
            suggested_links: ['existing-mem-001'],
          },
        ],
        episodic: [],
        procedural: [],
      };

      const createdNode = makeMemoryNode({ id: 'new-sem-001' });
      const client = makeMemoryClient();
      client.bulkCreate.mockResolvedValue([createdNode]);

      const pipeline = new CandidatePipeline({
        memoryClient: client,
        esClient: {} as ElasticsearchClient,
        embeddingService: makeNoopEmbeddingService(),
        logger: makeLogger(),
      });

      await pipeline.run(extractionWithLinks, pipelineContext, []);

      expect(client.addLink).toHaveBeenCalledWith(
        'new-sem-001',
        expect.objectContaining({
          target_id: 'existing-mem-001',
          type: 'related_to',
        })
      );
    });

    it('handles bulkCreate failure gracefully', async () => {
      const client = makeMemoryClient();
      client.bulkCreate.mockRejectedValue(new Error('ES write failed'));

      const pipeline = new CandidatePipeline({
        memoryClient: client,
        esClient: {} as ElasticsearchClient,
        embeddingService: makeNoopEmbeddingService(),
        logger: makeLogger(),
      });

      const result = await pipeline.run(singleSemanticExtraction, pipelineContext, []);

      expect(result.errors).toBeGreaterThan(0);
      expect(result.created).toBe(0);
    });

    it('reports created count matching bulkCreate results', async () => {
      const client = makeMemoryClient();
      client.bulkCreate.mockResolvedValue([
        makeMemoryNode({ id: 'n1' }),
        makeMemoryNode({ id: 'n2' }),
      ]);

      const twoExtraction: ExtractionResult = {
        semantic: [
          { summary: 'Fact 1', full: 'Content 1', confidence: 0.8 },
          { summary: 'Fact 2', full: 'Content 2', confidence: 0.75 },
        ],
        episodic: [],
        procedural: [],
      };

      const pipeline = new CandidatePipeline({
        memoryClient: client,
        esClient: {} as ElasticsearchClient,
        embeddingService: makeNoopEmbeddingService(),
        logger: makeLogger(),
      });

      const result = await pipeline.run(twoExtraction, pipelineContext, []);
      expect(result.created).toBe(2);
    });

    it('processes reinforcement signals even when no candidates extracted', async () => {
      const client = makeMemoryClient();
      client.get.mockResolvedValue(
        makeMemoryNode({
          id: 'existing-001',
          type: 'semantic',
          reinforcement_score: 0.1,
          utility: 0.5,
          status: 'candidate',
        })
      );
      client.update.mockResolvedValue(makeMemoryNode({ id: 'existing-001' }));

      const signals: ReinforcementSignal[] = [
        { memory_id: 'existing-001', effect: 'positive', kind: 'useful', reason: 'Was helpful' },
      ];

      const pipeline = new CandidatePipeline({
        memoryClient: client,
        esClient: {} as ElasticsearchClient,
        embeddingService: makeNoopEmbeddingService(),
        logger: makeLogger(),
      });

      // Should not throw
      await expect(pipeline.run(emptyExtraction, pipelineContext, signals)).resolves.not.toThrow();
    });
  });
});
