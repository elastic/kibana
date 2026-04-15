/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DecayService } from './decay_service';
import type { MemoryNode } from '@kbn/agent-builder-common';
import { loggerMock } from '@kbn/logging-mocks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2025-06-01T00:00:00.000Z');

const makeMemory = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
  id: 'mem-001',
  type: 'semantic',
  summary: 'Test memory',
  full: 'Full text of the test memory',
  confidence: 0.8,
  salience: 0.7,
  recency: NOW.toISOString(),
  utility: 0.6,
  stability: 0.5,
  access_count: 5,
  reinforcement_score: 0.5,
  status: 'established',
  source_refs: [],
  links: [],
  created_at: new Date('2025-05-01T00:00:00.000Z').toISOString(),
  updated_at: NOW.toISOString(),
  space: 'default',
  user_name: 'test-user',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DecayService', () => {
  let decay: DecayService;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    decay = new DecayService({ logger });
  });

  // ---- Recency decay formulas ----

  describe('recency decay factor', () => {
    it('returns 1.0 when last used today', () => {
      const memory = makeMemory({ last_used_at: NOW.toISOString() });
      const [result] = decay.applyDecay([memory], NOW);
      expect(result.days_since_last_use).toBeCloseTo(0, 2);
      expect(result.recency_decay_factor).toBeCloseTo(1.0, 4);
    });

    it('applies episodic lambda=0.1 correctly for 10 days', () => {
      // exp(-0.1 * 10) = exp(-1) ≈ 0.3679
      const lastUsed = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({ type: 'episodic', last_used_at: lastUsed.toISOString() });
      const [result] = decay.applyDecay([memory], NOW);
      expect(result.days_since_last_use).toBeCloseTo(10, 1);
      expect(result.recency_decay_factor).toBeCloseTo(Math.exp(-0.1 * 10), 4);
    });

    it('applies semantic lambda=0.03 correctly for 33 days', () => {
      // exp(-0.03 * 33) ≈ exp(-0.99) ≈ 0.3716 (half-life ≈ 23 days)
      const lastUsed = new Date(NOW.getTime() - 33 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({ type: 'semantic', last_used_at: lastUsed.toISOString() });
      const [result] = decay.applyDecay([memory], NOW);
      expect(result.days_since_last_use).toBeCloseTo(33, 1);
      expect(result.recency_decay_factor).toBeCloseTo(Math.exp(-0.03 * 33), 4);
    });

    it('applies procedural lambda=0.01 correctly for 100 days', () => {
      // exp(-0.01 * 100) = exp(-1) ≈ 0.3679
      const lastUsed = new Date(NOW.getTime() - 100 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({ type: 'procedural', last_used_at: lastUsed.toISOString() });
      const [result] = decay.applyDecay([memory], NOW);
      expect(result.days_since_last_use).toBeCloseTo(100, 1);
      expect(result.recency_decay_factor).toBeCloseTo(Math.exp(-0.01 * 100), 4);
    });

    it('episodic decays faster than semantic at same age', () => {
      const lastUsed = new Date(NOW.getTime() - 20 * 24 * 60 * 60 * 1000);
      const episodic = makeMemory({ type: 'episodic', last_used_at: lastUsed.toISOString() });
      const semantic = makeMemory({ type: 'semantic', last_used_at: lastUsed.toISOString() });
      const [r1] = decay.applyDecay([episodic], NOW);
      const [r2] = decay.applyDecay([semantic], NOW);
      expect(r1.recency_decay_factor).toBeLessThan(r2.recency_decay_factor);
    });

    it('semantic decays faster than procedural at same age', () => {
      const lastUsed = new Date(NOW.getTime() - 50 * 24 * 60 * 60 * 1000);
      const semantic = makeMemory({ type: 'semantic', last_used_at: lastUsed.toISOString() });
      const procedural = makeMemory({ type: 'procedural', last_used_at: lastUsed.toISOString() });
      const [r1] = decay.applyDecay([semantic], NOW);
      const [r2] = decay.applyDecay([procedural], NOW);
      expect(r1.recency_decay_factor).toBeLessThan(r2.recency_decay_factor);
    });

    it('falls back to recency field when last_used_at is absent', () => {
      const recencyDate = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({
        last_used_at: undefined,
        recency: recencyDate.toISOString(),
      });
      const [result] = decay.applyDecay([memory], NOW);
      expect(result.days_since_last_use).toBeCloseTo(5, 1);
    });

    it('falls back to updated_at when both last_used_at and recency are absent', () => {
      const updatedDate = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({
        last_used_at: undefined,
        recency: undefined as unknown as string, // force undefined
        updated_at: updatedDate.toISOString(),
      });
      const [result] = decay.applyDecay([memory], NOW);
      expect(result.days_since_last_use).toBeCloseTo(7, 1);
    });
  });

  // ---- Utility decay ----

  describe('utility decay', () => {
    it('does not apply utility decay when last used within 30 days', () => {
      const lastUsed = new Date(NOW.getTime() - 29 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({ last_used_at: lastUsed.toISOString(), utility: 0.8 });
      const [result] = decay.applyDecay([memory], NOW);
      expect(result.utility).toBeUndefined();
    });

    it('applies utility decay starting at exactly 30 days of stagnation', () => {
      const lastUsed = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({ last_used_at: lastUsed.toISOString(), utility: 0.8 });
      const [result] = decay.applyDecay([memory], NOW);
      // At exactly 30 days, stagnation days = 0, penalty = 0, utility should not change
      // (stagnationDays = daysSinceUsed - 30 = 30 - 30 = 0)
      expect(result.utility).toBeUndefined();
    });

    it('applies utility decay at 40 days stagnation: utility -= 0.02 * 10 = 0.2', () => {
      const lastUsed = new Date(NOW.getTime() - 40 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({ last_used_at: lastUsed.toISOString(), utility: 0.8 });
      const [result] = decay.applyDecay([memory], NOW);
      // stagnationDays = 40 - 30 = 10, penalty = 10 * 0.02 = 0.2
      expect(result.utility).toBeCloseTo(0.6, 4);
    });

    it('clamps utility to minimum 0', () => {
      // 80 days stagnation: penalty = 50 * 0.02 = 1.0, utility 0.5 → max(0, 0.5 - 1.0) = 0
      const lastUsed = new Date(NOW.getTime() - 80 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({ last_used_at: lastUsed.toISOString(), utility: 0.5 });
      const [result] = decay.applyDecay([memory], NOW);
      expect(result.utility).toBeGreaterThanOrEqual(0);
      expect(result.utility).toBe(0);
    });
  });

  // ---- Confidence decay for suspect ----

  describe('confidence decay (suspect)', () => {
    it('does not apply confidence decay to non-suspect memories', () => {
      const lastUsed = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({ status: 'established', last_used_at: lastUsed.toISOString(), confidence: 0.8 });
      const [result] = decay.applyDecay([memory], NOW);
      expect(result.confidence).toBeUndefined();
    });

    it('applies confidence decay to suspect memories: confidence -= 0.01 * days', () => {
      const lastUsed = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({ status: 'suspect', last_used_at: lastUsed.toISOString(), confidence: 0.8 });
      const [result] = decay.applyDecay([memory], NOW);
      // penalty = 10 * 0.01 = 0.1
      expect(result.confidence).toBeCloseTo(0.7, 4);
    });

    it('clamps confidence to minimum 0 for suspect memories', () => {
      const lastUsed = new Date(NOW.getTime() - 200 * 24 * 60 * 60 * 1000);
      const memory = makeMemory({ status: 'suspect', last_used_at: lastUsed.toISOString(), confidence: 0.5 });
      const [result] = decay.applyDecay([memory], NOW);
      expect(result.confidence).toBe(0);
    });
  });

  // ---- Batch processing ----

  describe('batch processing', () => {
    it('returns one result per memory', () => {
      const memories = [
        makeMemory({ id: 'a', last_used_at: NOW.toISOString() }),
        makeMemory({ id: 'b', last_used_at: NOW.toISOString() }),
        makeMemory({ id: 'c', last_used_at: NOW.toISOString() }),
      ];
      const results = decay.applyDecay(memories, NOW);
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.memory_id)).toEqual(['a', 'b', 'c']);
    });

    it('returns empty array for empty input', () => {
      const results = decay.applyDecay([], NOW);
      expect(results).toEqual([]);
    });

    it('continues processing remaining memories if one is malformed', () => {
      const good = makeMemory({ id: 'good', last_used_at: NOW.toISOString() });
      const bad = makeMemory({ id: 'bad', type: 'episodic', created_at: 'not-a-date' });
      const results = decay.applyDecay([good, bad], NOW);
      // Both should process — bad date leads to daysSinceLastUse=0 gracefully
      expect(results.length).toBeGreaterThanOrEqual(1);
      const goodResult = results.find((r) => r.memory_id === 'good');
      expect(goodResult).toBeDefined();
    });
  });

  // ---- memory_type in result ----

  it('includes memory_type in result for audit purposes', () => {
    const memory = makeMemory({ type: 'procedural' });
    const [result] = decay.applyDecay([memory], NOW);
    expect(result.memory_type).toBe('procedural');
  });
});
