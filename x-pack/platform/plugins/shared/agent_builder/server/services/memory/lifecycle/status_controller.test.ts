/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusController } from './status_controller';
import type { MemoryNode, MemoryStatus } from '@kbn/agent-builder-common';
import { loggerMock } from '@kbn/logging-mocks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = new Date('2025-06-01T00:00:00.000Z');
const daysAgo = (days: number): string =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const makeMemory = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
  id: 'mem-001',
  type: 'semantic',
  summary: 'Test memory',
  full: 'Full text',
  confidence: 0.8,
  salience: 0.7,
  recency: NOW.toISOString(),
  utility: 0.6,
  stability: 0.5,
  access_count: 3,
  reinforcement_score: 0.5,
  status: 'established',
  source_refs: [],
  links: [],
  created_at: daysAgo(10),
  updated_at: NOW.toISOString(),
  space: 'default',
  user_name: 'test-user',
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StatusController', () => {
  let controller: StatusController;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    controller = new StatusController({ logger });
  });

  // ---- candidate transitions ----

  describe('candidate', () => {
    it('promotes to provisional when reinforcement_score >= 0.3', () => {
      const memory = makeMemory({
        status: 'candidate',
        reinforcement_score: 0.3,
        created_at: daysAgo(1),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('provisional');
      expect(result.action).toBe('promote');
    });

    it('promotes to provisional when reinforcement_score > 0.3', () => {
      const memory = makeMemory({
        status: 'candidate',
        reinforcement_score: 0.45,
        created_at: daysAgo(1),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('provisional');
      expect(result.action).toBe('promote');
    });

    it('does NOT promote when reinforcement_score < 0.3 within age limit', () => {
      const memory = makeMemory({
        status: 'candidate',
        reinforcement_score: 0.25,
        created_at: daysAgo(2),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('candidate');
      expect(result.action).toBe('no_change');
    });

    it('prunes (to deprecated) when age > 3 days with reinforcement_score < 0.3', () => {
      const memory = makeMemory({
        status: 'candidate',
        reinforcement_score: 0.1,
        created_at: daysAgo(4),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('deprecated');
      expect(result.action).toBe('prune');
    });

    it('does not prune at exactly 3 days', () => {
      const memory = makeMemory({
        status: 'candidate',
        reinforcement_score: 0.0,
        created_at: daysAgo(3),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      // 3 days is not > 3 days so no prune
      expect(result.action).toBe('no_change');
    });

    it('promotes (not prunes) when old AND reinforcement meets threshold', () => {
      // Even if old, reinforce threshold takes priority
      const memory = makeMemory({
        status: 'candidate',
        reinforcement_score: 0.5,
        created_at: daysAgo(5),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('provisional');
      expect(result.action).toBe('promote');
    });
  });

  // ---- provisional transitions ----

  describe('provisional', () => {
    it('promotes to established when reinforcement_score >= 0.6', () => {
      const memory = makeMemory({
        status: 'provisional',
        reinforcement_score: 0.6,
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('established');
      expect(result.action).toBe('promote');
    });

    it('promotes to established when reinforcement_score > 0.6', () => {
      const memory = makeMemory({
        status: 'provisional',
        reinforcement_score: 0.75,
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('established');
      expect(result.action).toBe('promote');
    });

    it('no change when reinforcement_score < 0.6', () => {
      const memory = makeMemory({
        status: 'provisional',
        reinforcement_score: 0.5,
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('provisional');
      expect(result.action).toBe('no_change');
    });
  });

  // ---- established transitions ----

  describe('established', () => {
    const baseEstablished = (): MemoryNode =>
      makeMemory({
        status: 'established',
        reinforcement_score: 0.7,
        stability: 0.8,
        created_at: daysAgo(8),
      });

    it('promotes to consolidated when all three conditions are met', () => {
      const memory = baseEstablished();
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('consolidated');
      expect(result.action).toBe('promote');
    });

    it('does NOT promote when stability < 0.8', () => {
      const memory = { ...baseEstablished(), stability: 0.79 };
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('established');
      expect(result.action).toBe('no_change');
    });

    it('does NOT promote when age < 7 days', () => {
      const memory = { ...baseEstablished(), created_at: daysAgo(6) };
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('established');
      expect(result.action).toBe('no_change');
    });

    it('does NOT promote when reinforcement < 0.7', () => {
      const memory = { ...baseEstablished(), reinforcement_score: 0.69 };
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('established');
      expect(result.action).toBe('no_change');
    });

    it('does NOT promote when only stability and age are met', () => {
      const memory = { ...baseEstablished(), reinforcement_score: 0.65 };
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.action).toBe('no_change');
    });

    it('does NOT promote when only reinforcement and age are met', () => {
      const memory = { ...baseEstablished(), stability: 0.7 };
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.action).toBe('no_change');
    });

    it('does NOT promote when only stability and reinforcement are met', () => {
      const memory = { ...baseEstablished(), created_at: daysAgo(5) };
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.action).toBe('no_change');
    });
  });

  // ---- suspect transitions ----

  describe('suspect', () => {
    it('promotes to provisional when reinforcement_score >= 0.2', () => {
      const memory = makeMemory({
        status: 'suspect',
        reinforcement_score: 0.2,
        updated_at: daysAgo(1),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('provisional');
      expect(result.action).toBe('promote');
    });

    it('promotes to provisional when reinforcement_score > 0.2', () => {
      const memory = makeMemory({
        status: 'suspect',
        reinforcement_score: 0.35,
        updated_at: daysAgo(1),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('provisional');
      expect(result.action).toBe('promote');
    });

    it('deprecates when reinforcement_score < 0.2 and stale >= 3 days', () => {
      const memory = makeMemory({
        status: 'suspect',
        reinforcement_score: 0.05,
        updated_at: daysAgo(4),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.to_status).toBe('deprecated');
      expect(result.action).toBe('prune');
    });

    it('waits (no_change) when reinforcement_score < 0.2 but stale < 3 days', () => {
      const memory = makeMemory({
        status: 'suspect',
        reinforcement_score: 0.05,
        updated_at: daysAgo(2),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.action).toBe('no_change');
    });
  });

  // ---- deprecated transitions ----

  describe('deprecated', () => {
    it('flags for soft-delete when deprecated for >= 30 days', () => {
      const memory = makeMemory({
        status: 'deprecated',
        updated_at: daysAgo(31),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.action).toBe('flag_soft_delete');
      expect(result.should_soft_delete).toBe(true);
      expect(result.to_status).toBe('deprecated');
    });

    it('does not flag for soft-delete when deprecated for < 30 days', () => {
      const memory = makeMemory({
        status: 'deprecated',
        updated_at: daysAgo(15),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.action).toBe('no_change');
      expect(result.should_soft_delete).toBeUndefined();
    });
  });

  // ---- consolidated ----

  describe('consolidated', () => {
    it('takes no action on consolidated memories', () => {
      const memory = makeMemory({ status: 'consolidated' });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.action).toBe('no_change');
      expect(result.to_status).toBe('consolidated');
    });
  });

  // ---- batch processing ----

  describe('batch', () => {
    it('returns one result per memory', () => {
      const memories: MemoryNode[] = [
        makeMemory({ id: 'a', status: 'candidate', reinforcement_score: 0.4, created_at: daysAgo(1) }),
        makeMemory({ id: 'b', status: 'provisional', reinforcement_score: 0.7 }),
        makeMemory({ id: 'c', status: 'established', reinforcement_score: 0.75, stability: 0.85, created_at: daysAgo(10) }),
      ];
      const results = controller.evaluateTransitions(memories, NOW);
      expect(results).toHaveLength(3);
      expect(results[0].memory_id).toBe('a');
      expect(results[1].memory_id).toBe('b');
      expect(results[2].memory_id).toBe('c');
    });

    it('returns empty array for empty input', () => {
      expect(controller.evaluateTransitions([], NOW)).toEqual([]);
    });
  });

  // ---- reason string ----

  describe('reason string', () => {
    it('includes numeric values in reason string', () => {
      const memory = makeMemory({
        status: 'candidate',
        reinforcement_score: 0.4,
        created_at: daysAgo(1),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.reason).toContain('0.4');
    });

    it('includes missing conditions in established no_change reason', () => {
      const memory = makeMemory({
        status: 'established',
        reinforcement_score: 0.5,
        stability: 0.5,
        created_at: daysAgo(3),
      });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.reason).toContain('missing');
    });
  });

  // ---- from_status matches input ----

  it('sets from_status to the memory current status', () => {
    const statuses: MemoryStatus[] = ['candidate', 'provisional', 'established', 'deprecated'];
    for (const status of statuses) {
      const memory = makeMemory({ status });
      const [result] = controller.evaluateTransitions([memory], NOW);
      expect(result.from_status).toBe(status);
    }
  });
});
