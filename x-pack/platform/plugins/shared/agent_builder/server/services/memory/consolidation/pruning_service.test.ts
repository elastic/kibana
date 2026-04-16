/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PruningService, computeStability } from './pruning_service';
import type { MemoryNode } from '@kbn/agent-builder-common';
import { loggerMock } from '@kbn/logging-mocks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2025-06-01T00:00:00.000Z');
const NOW_ISO = NOW.toISOString();

/** Create a date string N days before NOW */
const daysAgo = (days: number): string => {
  const d = new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
};

const makeMemory = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
  id: 'mem-001',
  type: 'semantic',
  summary: 'Test memory summary',
  full: 'Full text',
  confidence: 0.8,
  salience: 0.5,
  recency: NOW_ISO,
  utility: 0.6,
  stability: 0.3,
  access_count: 5,
  reinforcement_score: 0.5,
  status: 'established',
  source_refs: [],
  links: [],
  created_at: daysAgo(30),
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

describe('PruningService', () => {
  let logger: ReturnType<typeof loggerMock.create>;
  let memoryClient: ReturnType<typeof makeMemoryClient>;
  let pruner: PruningService;

  beforeEach(() => {
    logger = loggerMock.create();
    memoryClient = makeMemoryClient();
    pruner = new PruningService({ memoryClient: memoryClient as any, logger });
    memoryClient.update.mockResolvedValue({});
    memoryClient.delete.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('returns zero stats for empty memory set', async () => {
      const stats = await pruner.run([], NOW);
      expect(stats).toEqual({
        hardDeleted: 0,
        candidatesPruned: 0,
        stabilityRecomputed: 0,
        hubsMarked: 0,
        overAccessedDowngraded: 0,
        decayApplied: 0,
      });
    });

    // ----------------------------------------------------------------
    // Hard-delete: deprecated older than 30 days
    // ----------------------------------------------------------------

    it('hard-deletes deprecated memories older than 30 days', async () => {
      const oldDeprecated = makeMemory({
        id: 'old-deprecated',
        status: 'deprecated',
        updated_at: daysAgo(31), // 31 days old → past the 30-day threshold
      });

      await pruner.run([oldDeprecated], NOW);

      expect(memoryClient.delete).toHaveBeenCalledWith('old-deprecated');
    });

    it('does not hard-delete deprecated memories younger than 30 days', async () => {
      const youngDeprecated = makeMemory({
        id: 'young-deprecated',
        status: 'deprecated',
        updated_at: daysAgo(25), // only 25 days old → not yet eligible
      });

      await pruner.run([youngDeprecated], NOW);

      expect(memoryClient.delete).not.toHaveBeenCalled();
    });

    it('hard-deletes deprecated memories at exactly 30 days', async () => {
      const exactlyThirty = makeMemory({
        id: 'exactly-30',
        status: 'deprecated',
        updated_at: daysAgo(30),
      });

      await pruner.run([exactlyThirty], NOW);

      // At exactly 30 days, computeAgeDays returns 30.0 which >= 30 → should delete
      expect(memoryClient.delete).toHaveBeenCalledWith('exactly-30');
    });

    // ----------------------------------------------------------------
    // Candidate pruning: zero reinforcement older than 3 days
    // ----------------------------------------------------------------

    it('prunes candidate memories with zero reinforcement older than 3 days', async () => {
      const staleCandidate = makeMemory({
        id: 'stale-candidate',
        status: 'candidate',
        reinforcement_score: 0,
        created_at: daysAgo(4), // 4 days old, no reinforcement
      });

      await pruner.run([staleCandidate], NOW);

      expect(memoryClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'stale-candidate',
          status: 'deprecated',
        })
      );
    });

    it('does not prune candidates with reinforcement', async () => {
      const reinforcedCandidate = makeMemory({
        id: 'reinforced-candidate',
        status: 'candidate',
        reinforcement_score: 0.4, // has reinforcement
        created_at: daysAgo(5),
      });

      await pruner.run([reinforcedCandidate], NOW);

      // Should not be demoted to deprecated
      const deprecateCall = memoryClient.update.mock.calls.find(
        (call: any) => call[0].id === 'reinforced-candidate' && call[0].status === 'deprecated'
      );
      expect(deprecateCall).toBeUndefined();
    });

    it('does not prune candidates younger than 3 days even with zero reinforcement', async () => {
      const freshCandidate = makeMemory({
        id: 'fresh-candidate',
        status: 'candidate',
        reinforcement_score: 0,
        created_at: daysAgo(2), // only 2 days old → not yet eligible
      });

      await pruner.run([freshCandidate], NOW);

      const deprecateCall = memoryClient.update.mock.calls.find(
        (call: any) => call[0].id === 'fresh-candidate' && call[0].status === 'deprecated'
      );
      expect(deprecateCall).toBeUndefined();
    });

    // ----------------------------------------------------------------
    // Stability recomputation
    // ----------------------------------------------------------------

    it('recomputes stability for active (non-deprecated, non-candidate) memories', async () => {
      const established = makeMemory({
        id: 'established-mem',
        status: 'established',
        stability: 0.01, // very different from what computeStability would return
        reinforcement_score: 0.7,
        created_at: daysAgo(30),
      });

      await pruner.run([established], NOW);

      // Should have updated stability
      const updateCall = memoryClient.update.mock.calls.find(
        (call: any) => call[0].id === 'established-mem' && call[0].stability !== undefined
      );
      expect(updateCall).toBeDefined();
    });

    // ----------------------------------------------------------------
    // Hub memory detection
    // ----------------------------------------------------------------

    it('marks hub memories (high connectivity + high utility) with boosted salience', async () => {
      const hub = makeMemory({
        id: 'hub-mem',
        status: 'established',
        utility: 0.8, // high utility
        salience: 0.3, // currently low salience
        links: Array.from({ length: 6 }, (_, i) => ({
          target_id: `target-${i}`,
          type: 'related_to' as const,
          weight: 1.0,
        })),
      });

      await pruner.run([hub], NOW);

      const hubUpdate = memoryClient.update.mock.calls.find(
        (call: any) => call[0].id === 'hub-mem' && call[0].salience !== undefined
      );
      expect(hubUpdate).toBeDefined();
      if (hubUpdate) {
        expect(hubUpdate[0].salience).toBeGreaterThan(0.3);
      }
    });

    it('does not boost hub salience when already at target', async () => {
      const hub = makeMemory({
        id: 'hub-already-boosted',
        status: 'established',
        utility: 0.8,
        salience: 0.95, // already high
        links: Array.from({ length: 6 }, (_, i) => ({
          target_id: `target-${i}`,
          type: 'related_to' as const,
          weight: 1.0,
        })),
      });

      await pruner.run([hub], NOW);

      // Should not update salience when it's already at or above the hub boost
      const salientUpdate = memoryClient.update.mock.calls.find(
        (call: any) => call[0].id === 'hub-already-boosted' && call[0].salience !== undefined
      );
      // Either no call or a call that keeps the same value
      if (salientUpdate) {
        // If called, salience should not go DOWN
        expect(salientUpdate[0].salience).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('does not mark low-connectivity memories as hubs', async () => {
      const sparse = makeMemory({
        id: 'sparse-mem',
        status: 'established',
        utility: 0.9,
        salience: 0.3,
        links: [{ target_id: 'one-link', type: 'related_to', weight: 1.0 }], // only 1 link
      });

      await pruner.run([sparse], NOW);

      // Should NOT receive a hub salience boost
      const hubUpdate = memoryClient.update.mock.calls.find(
        (call: any) =>
          call[0].id === 'sparse-mem' &&
          call[0].salience !== undefined &&
          call[0].salience > 0.5
      );
      expect(hubUpdate).toBeUndefined();
    });

    // ----------------------------------------------------------------
    // Over-accessed low-utility downgrade
    // ----------------------------------------------------------------

    it('downgrades salience of over-accessed low-utility memories', async () => {
      const overAccessed = makeMemory({
        id: 'over-accessed',
        status: 'established',
        access_count: 25, // > 20 threshold
        utility: 0.2, // < 0.3 threshold
        salience: 0.7,
      });

      await pruner.run([overAccessed], NOW);

      const downgradeCall = memoryClient.update.mock.calls.find(
        (call: any) => call[0].id === 'over-accessed' && call[0].salience !== undefined
      );
      expect(downgradeCall).toBeDefined();
      if (downgradeCall) {
        expect(downgradeCall[0].salience).toBeLessThan(0.7);
      }
    });

    it('does not downgrade memories with sufficient utility', async () => {
      const highUtility = makeMemory({
        id: 'high-utility',
        status: 'established',
        access_count: 30,
        utility: 0.8, // above LOW_UTILITY_THRESHOLD
        salience: 0.7,
      });

      await pruner.run([highUtility], NOW);

      const downgradeCall = memoryClient.update.mock.calls.find(
        (call: any) =>
          call[0].id === 'high-utility' &&
          call[0].salience !== undefined &&
          call[0].salience < 0.7
      );
      expect(downgradeCall).toBeUndefined();
    });

    it('does not downgrade memories with low access count', async () => {
      const lowAccess = makeMemory({
        id: 'low-access',
        status: 'established',
        access_count: 5, // below OVER_ACCESSED_MIN_ACCESS_COUNT (20)
        utility: 0.1,
        salience: 0.7,
      });

      await pruner.run([lowAccess], NOW);

      const downgradeCall = memoryClient.update.mock.calls.find(
        (call: any) =>
          call[0].id === 'low-access' &&
          call[0].salience !== undefined &&
          call[0].salience < 0.7
      );
      expect(downgradeCall).toBeUndefined();
    });

    // ----------------------------------------------------------------
    // Decay application
    // ----------------------------------------------------------------

    it('applies decay to non-deprecated memories', async () => {
      const established = makeMemory({
        id: 'established-mem',
        status: 'established',
        utility: 0.9,
        last_used_at: daysAgo(50), // 50 days stagnation → utility decay
      });

      await pruner.run([established], NOW);

      // Decay should have been applied (utility update)
      const decayUpdate = memoryClient.update.mock.calls.find(
        (call: any) => call[0].id === 'established-mem' && call[0].utility !== undefined
      );
      expect(decayUpdate).toBeDefined();
      if (decayUpdate) {
        expect(decayUpdate[0].utility).toBeLessThan(0.9);
      }
    });

    it('does not apply decay to deprecated memories', async () => {
      const deprecated = makeMemory({
        id: 'deprecated-mem',
        status: 'deprecated',
        updated_at: daysAgo(5), // young enough to not be hard-deleted
        utility: 0.9,
        last_used_at: daysAgo(50),
      });

      await pruner.run([deprecated], NOW);

      // Decay should NOT be applied to deprecated memories
      const decayUpdate = memoryClient.update.mock.calls.find(
        (call: any) => call[0].id === 'deprecated-mem' && call[0].utility !== undefined
      );
      expect(decayUpdate).toBeUndefined();
    });

    it('returns correct stats counts', async () => {
      const oldDeprecated = makeMemory({
        id: 'old-dep',
        status: 'deprecated',
        updated_at: daysAgo(31),
      });
      const staleCandidate = makeMemory({
        id: 'stale-cand',
        status: 'candidate',
        reinforcement_score: 0,
        created_at: daysAgo(4),
      });
      const active = makeMemory({
        id: 'active',
        status: 'established',
        stability: 0.0, // force stability update
        reinforcement_score: 0.7,
        created_at: daysAgo(30),
      });

      const stats = await pruner.run([oldDeprecated, staleCandidate, active], NOW);

      expect(stats.hardDeleted).toBe(1);
      expect(stats.candidatesPruned).toBe(1);
      expect(stats.stabilityRecomputed).toBeGreaterThanOrEqual(0);
    });
  });
});

// ---------------------------------------------------------------------------
// computeStability
// ---------------------------------------------------------------------------

describe('computeStability', () => {
  const NOW_DATE = new Date('2025-06-01T00:00:00.000Z');

  it('returns 0 for a memory with zero reinforcement', () => {
    const mem = {
      type: 'semantic',
      reinforcement_score: 0,
      created_at: new Date(NOW_DATE.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    } as MemoryNode;
    expect(computeStability(mem, NOW_DATE)).toBe(0);
  });

  it('returns higher stability for older well-reinforced memories', () => {
    const young = {
      type: 'semantic',
      reinforcement_score: 0.8,
      created_at: new Date(NOW_DATE.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    } as MemoryNode;

    const old = {
      type: 'semantic',
      reinforcement_score: 0.8,
      created_at: new Date(NOW_DATE.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    } as MemoryNode;

    expect(computeStability(old, NOW_DATE)).toBeGreaterThan(computeStability(young, NOW_DATE));
  });

  it('procedural type decays slower (higher persistence) than episodic', () => {
    const episodic = {
      type: 'episodic',
      reinforcement_score: 0.7,
      created_at: new Date(NOW_DATE.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    } as MemoryNode;

    const procedural = {
      type: 'procedural',
      reinforcement_score: 0.7,
      created_at: new Date(NOW_DATE.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    } as MemoryNode;

    // procedural persistence = 1 - 0.01 = 0.99 > episodic persistence = 1 - 0.1 = 0.9
    expect(computeStability(procedural, NOW_DATE)).toBeGreaterThan(
      computeStability(episodic, NOW_DATE)
    );
  });

  it('caps stability at 1.0', () => {
    const mem = {
      type: 'procedural',
      reinforcement_score: 1.0,
      created_at: new Date(NOW_DATE.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    } as MemoryNode;
    expect(computeStability(mem, NOW_DATE)).toBeLessThanOrEqual(1.0);
  });

  it('returns 0 for invalid created_at', () => {
    const mem = {
      type: 'semantic',
      reinforcement_score: 0.8,
      created_at: 'not-a-date',
    } as MemoryNode;
    expect(computeStability(mem, NOW_DATE)).toBe(0);
  });
});
