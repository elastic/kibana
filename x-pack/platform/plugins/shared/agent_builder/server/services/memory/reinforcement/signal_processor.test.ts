/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SignalProcessor } from './signal_processor';
import type { MemoryClient } from '../client';
import type { MemoryNode } from '@kbn/agent-builder-common';
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
  stability: 0.3,
  access_count: 5,
  reinforcement_score: 0.2,
  status: 'candidate',
  source_refs: [],
  links: [],
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  updated_at: new Date().toISOString(),
  space: 'default',
  user_name: 'user1',
  ...overrides,
});

const makeMemoryClient = (node: MemoryNode = makeMemoryNode()): jest.Mocked<MemoryClient> => ({
  get: jest.fn().mockResolvedValue(node),
  list: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue(node),
  update: jest.fn().mockResolvedValue(node),
  bulkCreate: jest.fn().mockResolvedValue([node]),
  delete: jest.fn().mockResolvedValue(true),
  search: jest.fn().mockResolvedValue([]),
  addLink: jest.fn().mockResolvedValue(undefined),
  removeLink: jest.fn().mockResolvedValue(undefined),
  updateLinkWeight: jest.fn().mockResolvedValue(undefined),
});

// ---------------------------------------------------------------------------
// Tests: SignalProcessor
// ---------------------------------------------------------------------------

describe('SignalProcessor', () => {
  describe('process', () => {
    it('is a no-op for empty signals array', async () => {
      const client = makeMemoryClient();
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      await processor.process([]);
      expect(client.get).not.toHaveBeenCalled();
      expect(client.update).not.toHaveBeenCalled();
    });

    it('skips processing when memory not found', async () => {
      const client = makeMemoryClient();
      client.get.mockRejectedValue(new Error('Memory node not found: missing-mem'));

      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'missing-mem', effect: 'positive', kind: 'useful' },
      ];

      // Should not throw
      await expect(processor.process(signals)).resolves.not.toThrow();
    });
  });

  describe('positive signals', () => {
    it('applies useful signal: utility += 0.05, reinforcement += type_rate for semantic (0.10)', async () => {
      const node = makeMemoryNode({
        type: 'semantic',
        utility: 0.5,
        reinforcement_score: 0.1,
        status: 'candidate',
      });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.utility).toBeCloseTo(0.55, 5);
      expect(updateCall.reinforcement_score).toBeCloseTo(0.2, 5); // 0.1 + 0.10 (semantic rate)
    });

    it('applies useful signal: reinforcement += 0.15 for episodic type', async () => {
      const node = makeMemoryNode({
        type: 'episodic',
        reinforcement_score: 0.0,
        status: 'candidate',
      });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.reinforcement_score).toBeCloseTo(0.15, 5); // episodic rate
    });

    it('applies useful signal: reinforcement += 0.05 for procedural type', async () => {
      const node = makeMemoryNode({
        type: 'procedural',
        reinforcement_score: 0.0,
        status: 'candidate',
      });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.reinforcement_score).toBeCloseTo(0.05, 5); // procedural rate
    });
  });

  describe('negative signals', () => {
    it('misleading: confidence -= 0.1, status → suspect', async () => {
      const node = makeMemoryNode({ confidence: 0.8, status: 'established' });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'negative', kind: 'misleading' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.confidence).toBeCloseTo(0.7, 5);
      expect(updateCall.status).toBe('suspect');
    });

    it('incorrect: confidence -= 0.15, status → suspect', async () => {
      const node = makeMemoryNode({ confidence: 0.8, status: 'established' });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'negative', kind: 'incorrect' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.confidence).toBeCloseTo(0.65, 5);
      expect(updateCall.status).toBe('suspect');
    });

    it('outdated: status → suspect (no confidence change)', async () => {
      const node = makeMemoryNode({ confidence: 0.8, status: 'provisional' });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'negative', kind: 'outdated' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.status).toBe('suspect');
      expect(updateCall.confidence).toBeUndefined(); // no confidence change for outdated
    });

    it('unused signal: no global score change (local policy only)', async () => {
      const node = makeMemoryNode({ status: 'established' });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'negative', kind: 'unused' },
      ];

      await processor.process(signals);

      // update should still be called (for last_reinforced_at), but no score changes
      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.reinforcement_score).toBeUndefined();
      expect(updateCall.confidence).toBeUndefined();
      expect(updateCall.utility).toBeUndefined();
      expect(updateCall.status).toBeUndefined();
    });

    it('irrelevant signal: no global score change (local policy only)', async () => {
      const node = makeMemoryNode({ status: 'established' });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'negative', kind: 'irrelevant' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.reinforcement_score).toBeUndefined();
      expect(updateCall.confidence).toBeUndefined();
      expect(updateCall.status).toBeUndefined();
    });

    it('duplicate signal: logged but no score mutation', async () => {
      const node = makeMemoryNode({ status: 'established' });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'negative', kind: 'duplicate', reason: 'Exact duplicate' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.reinforcement_score).toBeUndefined();
      expect(updateCall.confidence).toBeUndefined();
      expect(updateCall.status).toBeUndefined();
    });
  });

  describe('status promotion state machine', () => {
    it('promotes candidate → provisional when reinforcement_score >= 0.3', async () => {
      const node = makeMemoryNode({
        status: 'candidate',
        reinforcement_score: 0.25, // current
        type: 'semantic', // semantic rate = 0.1 → 0.25 + 0.1 = 0.35 > 0.3
      });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.status).toBe('provisional');
    });

    it('does NOT promote candidate → provisional when below threshold', async () => {
      const node = makeMemoryNode({
        status: 'candidate',
        reinforcement_score: 0.1, // 0.1 + 0.1 = 0.2, still < 0.3
        type: 'semantic',
      });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      // Status should NOT be changed (no promotion)
      expect(updateCall.status).toBeUndefined();
    });

    it('promotes provisional → established when reinforcement_score >= 0.6', async () => {
      const node = makeMemoryNode({
        status: 'provisional',
        reinforcement_score: 0.55,
        type: 'semantic', // 0.55 + 0.10 = 0.65 >= 0.6
      });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.status).toBe('established');
    });

    it('promotes established → consolidated when all three conditions met', async () => {
      const createdAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago

      const node = makeMemoryNode({
        status: 'established',
        reinforcement_score: 0.68, // + 0.10 = 0.78 >= 0.7
        stability: 0.85, // >= 0.8
        created_at: createdAt, // 10 days >= 7 days
        type: 'semantic',
      });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.status).toBe('consolidated');
    });

    it('does NOT promote established → consolidated when stability insufficient', async () => {
      const createdAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

      const node = makeMemoryNode({
        status: 'established',
        reinforcement_score: 0.70,
        stability: 0.5, // < 0.8, fails condition
        created_at: createdAt,
        type: 'semantic',
      });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.status).toBeUndefined();
    });

    it('does NOT promote established → consolidated when age insufficient', async () => {
      const createdAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days < 7

      const node = makeMemoryNode({
        status: 'established',
        reinforcement_score: 0.70,
        stability: 0.85,
        created_at: createdAt,
        type: 'semantic',
      });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.status).toBeUndefined();
    });

    it('forces suspect status even if promotion threshold is met (negative overrides promotion)', async () => {
      const node = makeMemoryNode({
        status: 'candidate',
        reinforcement_score: 0.35, // would promote to provisional
        type: 'semantic',
      });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      // One positive that would promote, one negative that forces suspect
      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
        { memory_id: 'mem-001', effect: 'negative', kind: 'misleading' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      // Suspect should win over promotion
      expect(updateCall.status).toBe('suspect');
    });

    it('processes multiple signals for the same memory in a single update', async () => {
      const node = makeMemoryNode({
        type: 'semantic',
        reinforcement_score: 0.0,
        utility: 0.5,
        status: 'candidate',
      });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      // Two useful signals for the same memory
      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
      ];

      await processor.process(signals);

      // Should only update once (grouped by memory_id)
      expect(client.update).toHaveBeenCalledTimes(1);

      const updateCall = client.update.mock.calls[0][0];
      // Two useful signals: 2 * 0.10 = 0.20 reinforcement, 2 * 0.05 = 0.10 utility
      expect(updateCall.reinforcement_score).toBeCloseTo(0.20, 5);
      expect(updateCall.utility).toBeCloseTo(0.60, 5);
    });
  });

  describe('edge cases', () => {
    it('clamps confidence to [0, 1] after penalty', async () => {
      const node = makeMemoryNode({ confidence: 0.05 }); // very low confidence
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'negative', kind: 'incorrect' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.confidence).toBeGreaterThanOrEqual(0);
    });

    it('clamps utility to [0, 1] after increment', async () => {
      const node = makeMemoryNode({ utility: 0.99 });
      const client = makeMemoryClient(node);
      const processor = new SignalProcessor({ memoryClient: client, logger: makeLogger() });

      const signals: ReinforcementSignal[] = [
        { memory_id: 'mem-001', effect: 'positive', kind: 'useful' },
      ];

      await processor.process(signals);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.utility).toBeLessThanOrEqual(1.0);
    });
  });
});
