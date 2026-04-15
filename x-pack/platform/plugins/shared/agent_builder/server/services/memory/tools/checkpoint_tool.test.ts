/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCheckpointTool } from './checkpoint_tool';
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

const makeContext = (): jest.Mocked<ToolHandlerContext> => ({
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
  runContext: { runId: 'run-001', stack: [] },
});

const makeMemoryClient = (searchResults: MemoryNode[] = []) => ({
  get: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  bulkCreate: jest.fn(),
  delete: jest.fn(),
  search: jest.fn().mockResolvedValue(searchResults),
  addLink: jest.fn(),
  removeLink: jest.fn(),
  updateLinkWeight: jest.fn(),
});

const makeMemoryService = (client: ReturnType<typeof makeMemoryClient>): MemoryService => ({
  getScopedClient: jest.fn().mockResolvedValue(client),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkpoint tool', () => {
  describe('final=false (retrieval mode)', () => {
    it('returns newly retrieved memories not yet in the active set', async () => {
      const mem1 = makeMemoryNode({ id: 'mem-001', summary: 'Memory 1', utility: 0.8 });
      const mem2 = makeMemoryNode({ id: 'mem-002', summary: 'Memory 2', utility: 0.6 });

      const client = makeMemoryClient([mem1, mem2]);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createCheckpointTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      const result = await tool.handler(
        { goal: 'implement feature X', final: false },
        context
      );

      expect(result).toHaveProperty('results');
      const data = (result as any).results[0].data;

      expect(data.new_memories).toHaveLength(2);
      expect(data.new_memories[0].id).toBe('mem-001');
      expect(data.new_memories[1].id).toBe('mem-002');
      expect(data.memory_state.total_retrieved).toBe(2);
    });

    it('only returns NEW memories when some are already in the active set', async () => {
      const mem1 = makeMemoryNode({ id: 'mem-001', summary: 'Memory 1' });
      const mem2 = makeMemoryNode({ id: 'mem-002', summary: 'Memory 2' });

      const client = makeMemoryClient([mem1, mem2]);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      // Pre-populate mem-001 in the active set
      activeSet.addRetrieved(mem1);

      const tool = createCheckpointTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      const result = await tool.handler({ goal: 'test goal', final: false }, context);

      const data = (result as any).results[0].data;
      // Only mem-002 should be in new_memories
      expect(data.new_memories).toHaveLength(1);
      expect(data.new_memories[0].id).toBe('mem-002');
    });

    it('uses goal + query_hint + missing_info as the search query', async () => {
      const client = makeMemoryClient([]);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createCheckpointTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      await tool.handler(
        {
          goal: 'find user preferences',
          query_hint: 'typescript strict',
          missing_info: 'linting rules',
          final: false,
        },
        context
      );

      expect(client.search).toHaveBeenCalledWith(
        'find user preferences typescript strict linting rules',
        expect.objectContaining({ stage: 'tool_checkpoint' })
      );
    });

    it('returns empty new_memories when retrieval throws', async () => {
      const client = makeMemoryClient([]);
      client.search.mockRejectedValue(new Error('ES is down'));
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createCheckpointTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      const result = await tool.handler({ goal: 'test', final: false }, context);

      const data = (result as any).results[0].data;
      expect(data.new_memories).toHaveLength(0);
      expect(context.logger.warn).toHaveBeenCalled();
    });

    it('tracks injected token count for new memories', async () => {
      const mem1 = makeMemoryNode({ id: 'mem-001', summary: 'A'.repeat(40) }); // 10 tokens
      const client = makeMemoryClient([mem1]);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createCheckpointTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      await tool.handler({ goal: 'test', final: false }, context);

      expect(activeSet.getInjectedTokenCount()).toBe(ActiveMemorySet.estimateTokens('A'.repeat(40)));
    });
  });

  describe('final=true (bundle mode)', () => {
    it('returns all used and unused memories sorted by utility', async () => {
      const mem1 = makeMemoryNode({ id: 'mem-001', summary: 'High utility', utility: 0.9 });
      const mem2 = makeMemoryNode({ id: 'mem-002', summary: 'Low utility', utility: 0.3 });
      const mem3 = makeMemoryNode({ id: 'mem-003', summary: 'Medium utility', utility: 0.6 });

      const client = makeMemoryClient([]);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      activeSet.addRetrieved(mem1);
      activeSet.addRetrieved(mem2);
      activeSet.addRetrieved(mem3);
      activeSet.markUsed('mem-001');
      activeSet.markUsed('mem-003');

      const tool = createCheckpointTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      const result = await tool.handler({ goal: 'wrap up', final: true }, context);

      const data = (result as any).results[0].data;

      // Used memories sorted by utility descending
      expect(data.used_memories).toHaveLength(2);
      expect(data.used_memories[0].id).toBe('mem-001'); // utility 0.9
      expect(data.used_memories[1].id).toBe('mem-003'); // utility 0.6

      // Unused memories
      expect(data.unused_memories).toHaveLength(1);
      expect(data.unused_memories[0].id).toBe('mem-002');
    });

    it('does NOT call memoryClient.search when final=true', async () => {
      const client = makeMemoryClient([]);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      const tool = createCheckpointTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      await tool.handler({ goal: 'wrap up', final: true }, context);

      expect(service.getScopedClient).not.toHaveBeenCalled();
      expect(client.search).not.toHaveBeenCalled();
    });

    it('returns memory_state with correct counts', async () => {
      const mem1 = makeMemoryNode({ id: 'mem-001' });
      const mem2 = makeMemoryNode({ id: 'mem-002' });

      const client = makeMemoryClient([]);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();

      activeSet.addRetrieved(mem1);
      activeSet.addRetrieved(mem2);
      activeSet.markUsed('mem-001');

      const tool = createCheckpointTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      const result = await tool.handler({ goal: 'wrap up', final: true }, context);

      const data = (result as any).results[0].data;
      expect(data.memory_state.used_count).toBe(1);
      expect(data.memory_state.unused_count).toBe(1);
      expect(data.memory_state.signal_count).toBe(0);
    });

    it('includes candidate memories in the response', async () => {
      const candidate = makeMemoryNode({ id: 'cand-001', summary: 'A candidate memory' });

      const client = makeMemoryClient([]);
      const service = makeMemoryService(client);
      const activeSet = new ActiveMemorySet();
      activeSet.addCandidate(candidate);

      const tool = createCheckpointTool({
        getMemoryService: () => service,
        getActiveMemorySet: () => activeSet,
      });

      const context = makeContext();
      const result = await tool.handler({ goal: 'wrap up', final: true }, context);

      const data = (result as any).results[0].data;
      expect(data.candidate_memories).toHaveLength(1);
      expect(data.candidate_memories[0].id).toBe('cand-001');
    });
  });
});
