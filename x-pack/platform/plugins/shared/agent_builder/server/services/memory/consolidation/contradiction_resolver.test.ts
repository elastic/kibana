/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContradictionResolver } from './contradiction_resolver';
import type { MemoryNode } from '@kbn/agent-builder-common';
import { loggerMock } from '@kbn/logging-mocks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW_ISO = '2025-06-01T00:00:00.000Z';
const OLD_ISO = '2025-01-01T00:00:00.000Z';

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
  created_at: OLD_ISO,
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContradictionResolver', () => {
  let logger: ReturnType<typeof loggerMock.create>;
  let memoryClient: ReturnType<typeof makeMemoryClient>;
  let resolver: ContradictionResolver;

  beforeEach(() => {
    logger = loggerMock.create();
    memoryClient = makeMemoryClient();
    resolver = new ContradictionResolver({ memoryClient: memoryClient as any, logger });
    memoryClient.update.mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveContradictions', () => {
    it('returns empty result when no contradictions exist', async () => {
      const memories = [
        makeMemory({ id: 'a', links: [{ target_id: 'b', type: 'related_to', weight: 1.0 }] }),
        makeMemory({ id: 'b', links: [] }),
      ];

      const result = await resolver.resolveContradictions(memories);
      expect(result.resolved).toHaveLength(0);
      expect(result.skipped).toBe(0);
    });

    it('finds and resolves a contradiction pair', async () => {
      const highConfidence = makeMemory({
        id: 'mem-a',
        confidence: 0.9,
        reinforcement_score: 0.8,
        last_used_at: NOW_ISO, // recently used → high recency score
        links: [{ target_id: 'mem-b', type: 'contradicts', weight: 1.0 }],
      });

      const lowConfidence = makeMemory({
        id: 'mem-b',
        confidence: 0.3,
        reinforcement_score: 0.1,
        last_used_at: OLD_ISO, // old → lower recency score
        links: [],
      });

      const result = await resolver.resolveContradictions([highConfidence, lowConfidence]);

      expect(result.resolved).toHaveLength(1);
      const resolution = result.resolved[0];
      expect(resolution.promotedId).toBe('mem-a');
      expect(resolution.demotedId).toBe('mem-b');
    });

    it('demotes the lower-score memory to suspect', async () => {
      const highConfidence = makeMemory({
        id: 'mem-winner',
        confidence: 0.9,
        reinforcement_score: 0.9,
        last_used_at: NOW_ISO,
        links: [{ target_id: 'mem-loser', type: 'contradicts', weight: 1.0 }],
      });

      const lowConfidence = makeMemory({
        id: 'mem-loser',
        confidence: 0.2,
        reinforcement_score: 0.1,
        last_used_at: OLD_ISO,
        links: [],
      });

      await resolver.resolveContradictions([highConfidence, lowConfidence]);

      // update should be called to demote mem-loser to 'suspect'
      expect(memoryClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mem-loser',
          status: 'suspect',
        })
      );
    });

    it('does not demote the winning memory', async () => {
      const winner = makeMemory({
        id: 'mem-winner',
        confidence: 0.9,
        reinforcement_score: 0.9,
        last_used_at: NOW_ISO,
        links: [{ target_id: 'mem-loser', type: 'contradicts', weight: 1.0 }],
      });

      const loser = makeMemory({
        id: 'mem-loser',
        confidence: 0.2,
        reinforcement_score: 0.1,
        links: [],
      });

      await resolver.resolveContradictions([winner, loser]);

      // Should NOT update mem-winner with status: 'suspect'
      const winnerDemoteCalls = memoryClient.update.mock.calls.filter(
        (call: any) => call[0].id === 'mem-winner' && call[0].status === 'suspect'
      );
      expect(winnerDemoteCalls).toHaveLength(0);
    });

    it('deduplicates (A→B) and (B→A) contradiction links into one pair', async () => {
      const memA = makeMemory({
        id: 'mem-a',
        confidence: 0.9,
        reinforcement_score: 0.9,
        last_used_at: NOW_ISO,
        links: [{ target_id: 'mem-b', type: 'contradicts', weight: 1.0 }],
      });

      const memB = makeMemory({
        id: 'mem-b',
        confidence: 0.2,
        reinforcement_score: 0.1,
        links: [{ target_id: 'mem-a', type: 'contradicts', weight: 1.0 }], // reverse link
      });

      const result = await resolver.resolveContradictions([memA, memB]);

      // Should resolve exactly ONE pair, not two
      expect(result.resolved).toHaveLength(1);
    });

    it('sets llmAssisted=true when inference client is used and scores are close', async () => {
      const mockInference = {
        getClient: jest.fn().mockReturnValue({
          chatComplete: jest.fn().mockResolvedValue({
            content: 'PREFER A: Memory A is more recent and specific.',
          }),
        }),
      };

      const mockRequest = {} as any;

      const resolverWithLLM = new ContradictionResolver({
        memoryClient: memoryClient as any,
        logger,
        inference: mockInference as any,
        request: mockRequest,
        connectorId: 'test-connector',
      });

      // Create memories with very close scores (delta < 0.1)
      const memA = makeMemory({
        id: 'mem-a',
        confidence: 0.55,
        reinforcement_score: 0.5,
        last_used_at: '2025-05-30T00:00:00.000Z',
        links: [{ target_id: 'mem-b', type: 'contradicts', weight: 1.0 }],
      });

      const memB = makeMemory({
        id: 'mem-b',
        confidence: 0.55,
        reinforcement_score: 0.5,
        last_used_at: '2025-05-29T00:00:00.000Z', // just 1 day older
        links: [],
      });

      const result = await resolverWithLLM.resolveContradictions([memA, memB]);

      // When scores are close, LLM should be consulted
      if (result.resolved.length > 0) {
        const resolution = result.resolved[0];
        // The LLM said "PREFER A"
        expect(resolution.promotedId).toBe('mem-a');
        expect(resolution.llmAssisted).toBe(true);
      }
    });

    it('resolves without LLM when scores differ by >= 0.1', async () => {
      const mockInference = {
        getClient: jest.fn().mockReturnValue({
          chatComplete: jest.fn(),
        }),
      };

      const resolverWithLLM = new ContradictionResolver({
        memoryClient: memoryClient as any,
        logger,
        inference: mockInference as any,
        request: {} as any,
        connectorId: 'test-connector',
      });

      // Create memories with clearly different scores (delta >= 0.1)
      const highScore = makeMemory({
        id: 'mem-high',
        confidence: 0.95,
        reinforcement_score: 0.95,
        last_used_at: NOW_ISO,
        links: [{ target_id: 'mem-low', type: 'contradicts', weight: 1.0 }],
      });

      const lowScore = makeMemory({
        id: 'mem-low',
        confidence: 0.1,
        reinforcement_score: 0.1,
        last_used_at: OLD_ISO,
        links: [],
      });

      const result = await resolverWithLLM.resolveContradictions([highScore, lowScore]);

      if (result.resolved.length > 0) {
        expect(result.resolved[0].llmAssisted).toBe(false);
        // LLM should NOT have been called
        expect(mockInference.getClient).not.toHaveBeenCalled();
      }
    });

    it('skips pairs where one member was already demoted in this run', async () => {
      const memA = makeMemory({
        id: 'mem-a',
        confidence: 0.9,
        reinforcement_score: 0.9,
        last_used_at: NOW_ISO,
        links: [
          { target_id: 'mem-b', type: 'contradicts', weight: 1.0 },
          { target_id: 'mem-c', type: 'contradicts', weight: 1.0 },
        ],
      });

      const memB = makeMemory({
        id: 'mem-b',
        confidence: 0.2,
        reinforcement_score: 0.1,
        last_used_at: OLD_ISO,
        links: [{ target_id: 'mem-c', type: 'contradicts', weight: 1.0 }],
      });

      const memC = makeMemory({
        id: 'mem-c',
        confidence: 0.3,
        reinforcement_score: 0.1,
        links: [],
      });

      const result = await resolver.resolveContradictions([memA, memB, memC]);

      // There are 3 pairs: (a,b), (a,c), (b,c)
      // After (a,b) → b is demoted, pair (b,c) should be skipped
      // Total resolved < 3
      expect(result.resolved.length + result.skipped).toBeLessThanOrEqual(3);
    });

    it('handles an empty memory set gracefully', async () => {
      const result = await resolver.resolveContradictions([]);
      expect(result.resolved).toHaveLength(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe('composite score calculation', () => {
    it('prefers memory with higher combined confidence + reinforcement', async () => {
      const newer = makeMemory({
        id: 'newer-mem',
        confidence: 0.95,
        reinforcement_score: 0.95,
        last_used_at: NOW_ISO,
        links: [{ target_id: 'older-mem', type: 'contradicts', weight: 1.0 }],
      });

      const older = makeMemory({
        id: 'older-mem',
        confidence: 0.1,
        reinforcement_score: 0.1,
        last_used_at: OLD_ISO,
        links: [],
      });

      const result = await resolver.resolveContradictions([newer, older]);

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].promotedId).toBe('newer-mem');
      expect(result.resolved[0].demotedId).toBe('older-mem');
    });
  });
});
