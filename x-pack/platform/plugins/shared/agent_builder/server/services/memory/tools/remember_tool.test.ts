/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRememberTool } from './remember_tool';
import { ActiveMemorySet } from '../active_memory_set';
import type { MemoryNode } from '@kbn/agent-builder-common';
import type { MemoryService } from '../memory_service';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeMemoryNode = (overrides: Partial<MemoryNode> = {}): MemoryNode => ({
  id: 'mem-001',
  type: 'semantic',
  summary: 'User prefers TypeScript strict mode',
  full: 'The user has explicitly stated that all new TypeScript code must use strict mode.',
  confidence: 0.9,
  salience: 0.8,
  recency: '2026-01-01T00:00:00.000Z',
  utility: 0.75,
  stability: 0.5,
  access_count: 3,
  reinforcement_score: 0.4,
  status: 'established',
  source_refs: [],
  links: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  space: 'default',
  user_name: 'elastic',
  ...overrides,
});

const makeMemoryClient = (memory?: MemoryNode, neighbors: MemoryNode[] = []) => ({
  get: jest.fn().mockImplementation((id: string) => {
    if (memory && memory.id === id) return Promise.resolve(memory);
    return Promise.reject(new Error(`Memory not found: ${id}`));
  }),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  bulkCreate: jest.fn(),
  delete: jest.fn(),
  search: jest.fn(),
  addLink: jest.fn(),
  removeLink: jest.fn(),
  updateLinkWeight: jest.fn(),
  // Used internally by graphService
  _neighbors: neighbors,
});

// Mock graph traversal
jest.mock('../graph/graph_traversal', () => ({
  createGraphTraversalService: jest.fn(() => ({
    getNeighbors: jest.fn().mockResolvedValue([]),
  })),
}));

const makeContext = (runId = 'run-001'): jest.Mocked<ToolHandlerContext> => ({
  request: {} as any,
  spaceId: 'default',
  esClient: {} as any,
  savedObjectsClient: {} as any,
  modelProvider: {} as any,
  toolProvider: {} as any,
  runner: {} as any,
  resultStore: {} as any,
  events: {} as any,
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  } as any,
  prompts: {} as any,
  stateManager: {} as any,
  attachments: {} as any,
  filestore: {} as any,
  skills: {} as any,
  toolManager: {} as any,
  runContext: { runId, stack: [] },
});

const makeMemoryService = (client: ReturnType<typeof makeMemoryClient>): MemoryService => ({
  getScopedClient: jest.fn().mockResolvedValue(client),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('remember tool', () => {
  describe('cap enforcement', () => {
    it('returns an error when the per-round call cap is exceeded', async () => {
      const memory = makeMemoryNode();
      const client = makeMemoryClient(memory);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createRememberTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();

      // Exhaust the cap
      for (let i = 0; i < ActiveMemorySet.MAX_REMEMBER_CALLS; i++) {
        activeSet.recordRememberCall();
      }

      // This call should be rejected
      const result = await tool.handler({ memory_id: 'mem-001', full: false }, context);

      expect(result).toHaveProperty('results');
      const firstResult = (result as any).results[0];
      expect(firstResult.type).toBe('error');
      expect(firstResult.data.message).toContain('cap reached');
      expect(service.getScopedClient).not.toHaveBeenCalled();
    });

    it('allows up to MAX_REMEMBER_CALLS calls', async () => {
      const memory = makeMemoryNode();
      const client = makeMemoryClient(memory);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createRememberTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();

      // Should succeed for exactly MAX_REMEMBER_CALLS calls
      for (let i = 0; i < ActiveMemorySet.MAX_REMEMBER_CALLS; i++) {
        const result = await tool.handler({ memory_id: 'mem-001', full: false }, context);
        const firstResult = (result as any).results[0];
        expect(firstResult.type).not.toBe('error');
      }

      expect(activeSet.getRememberCallCount()).toBe(ActiveMemorySet.MAX_REMEMBER_CALLS);
    });
  });

  describe('summary mode (full=false)', () => {
    it('returns the summary without the full field', async () => {
      const memory = makeMemoryNode();
      const client = makeMemoryClient(memory);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createRememberTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      const result = await tool.handler({ memory_id: 'mem-001', full: false }, context);

      const data = (result as any).results[0].data;
      expect(data.memory).toHaveProperty('id', 'mem-001');
      expect(data.memory).toHaveProperty('summary');
      expect(data.memory).not.toHaveProperty('full');
    });

    it('increments access_count without modifying reinforcement_score', async () => {
      const memory = makeMemoryNode({ access_count: 5, reinforcement_score: 0.4 });
      const client = makeMemoryClient(memory);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createRememberTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      await tool.handler({ memory_id: 'mem-001', full: false }, context);

      expect(client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mem-001',
          access_count: 6,
        })
      );
      // reinforcement_score should NOT be in the update for full=false
      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall).not.toHaveProperty('reinforcement_score');
    });
  });

  describe('full mode (full=true)', () => {
    it('returns both summary and full content', async () => {
      const memory = makeMemoryNode();
      const client = makeMemoryClient(memory);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createRememberTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      const result = await tool.handler({ memory_id: 'mem-001', full: true }, context);

      const data = (result as any).results[0].data;
      expect(data.memory).toHaveProperty('id', 'mem-001');
      expect(data.memory).toHaveProperty('summary');
      expect(data.memory).toHaveProperty('full');
    });

    it('applies reinforcement_score bump of 0.05 for full reads', async () => {
      const memory = makeMemoryNode({ reinforcement_score: 0.4 });
      const client = makeMemoryClient(memory);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createRememberTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      await tool.handler({ memory_id: 'mem-001', full: true }, context);

      expect(client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mem-001',
          reinforcement_score: expect.closeTo(0.45, 5),
        })
      );
    });

    it('caps reinforcement_score at 1.0', async () => {
      const memory = makeMemoryNode({ reinforcement_score: 0.98 });
      const client = makeMemoryClient(memory);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createRememberTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      await tool.handler({ memory_id: 'mem-001', full: true }, context);

      const updateCall = client.update.mock.calls[0][0];
      expect(updateCall.reinforcement_score).toBe(1.0);
    });
  });

  describe('error handling', () => {
    it('returns an error when memory is not found', async () => {
      const client = makeMemoryClient(undefined);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createRememberTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      const result = await tool.handler({ memory_id: 'nonexistent', full: false }, context);

      const firstResult = (result as any).results[0];
      expect(firstResult.type).toBe('error');
      expect(firstResult.data.message).toContain('Memory not found');
    });
  });

  describe('active set integration', () => {
    it('marks the memory as retrieved and used in the active set', async () => {
      const memory = makeMemoryNode({ id: 'mem-001' });
      const client = makeMemoryClient(memory);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createRememberTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      await tool.handler({ memory_id: 'mem-001', full: false }, context);

      expect(activeSet.hasRetrieved('mem-001')).toBe(true);
      expect(activeSet.isUsed('mem-001')).toBe(true);
    });
  });

  describe('related memories', () => {
    it('returns an empty related array when graph traversal fails', async () => {
      const { createGraphTraversalService } = jest.requireMock('../graph/graph_traversal');
      createGraphTraversalService.mockReturnValueOnce({
        getNeighbors: jest.fn().mockRejectedValue(new Error('graph error')),
      });

      const memory = makeMemoryNode();
      const client = makeMemoryClient(memory);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createRememberTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      const result = await tool.handler({ memory_id: 'mem-001', full: false }, context);

      const data = (result as any).results[0].data;
      expect(data.related).toHaveLength(0);
      expect(context.logger.warn).toHaveBeenCalled();
    });
  });
});
