/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReinforceTool } from './reinforce_tool';
import { ActiveMemorySet } from '../active_memory_set';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

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

const makeItem = (memoryId: string, effect: 'positive' | 'negative' = 'positive') => ({
  memory_id: memoryId,
  effect,
  kind: 'useful' as const,
  reason: 'test reason',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('reinforce tool', () => {
  describe('advisory batching', () => {
    it('enqueues signals in the active set without immediately applying them', async () => {
      const activeSet = new ActiveMemorySet();
      const tool = createReinforceTool({ getActiveMemorySet: () => activeSet });

      const context = makeContext();
      await tool.handler(
        {
          items: [
            makeItem('mem-001', 'positive'),
            makeItem('mem-002', 'negative'),
          ],
        },
        context
      );

      const signals = activeSet.getSignals();
      expect(signals).toHaveLength(2);
      expect(signals[0].memory_id).toBe('mem-001');
      expect(signals[0].effect).toBe('positive');
      expect(signals[1].memory_id).toBe('mem-002');
      expect(signals[1].effect).toBe('negative');
    });

    it('returns the correct processed count', async () => {
      const activeSet = new ActiveMemorySet();
      const tool = createReinforceTool({ getActiveMemorySet: () => activeSet });

      const context = makeContext();
      const result = await tool.handler(
        { items: [makeItem('mem-001'), makeItem('mem-002')] },
        context
      );

      const data = (result as any).results[0].data;
      expect(data.processed).toBe(2);
      expect(data.skipped).toBe(0);
    });

    it('preserves reason and kind in the enqueued signal', async () => {
      const activeSet = new ActiveMemorySet();
      const tool = createReinforceTool({ getActiveMemorySet: () => activeSet });

      const context = makeContext();
      await tool.handler(
        {
          items: [
            {
              memory_id: 'mem-001',
              effect: 'negative',
              kind: 'outdated',
              reason: 'This information is from 2020',
            },
          ],
        },
        context
      );

      const signals = activeSet.getSignals();
      expect(signals[0].kind).toBe('outdated');
      expect(signals[0].reason).toBe('This information is from 2020');
    });
  });

  describe('per-call cap enforcement', () => {
    it('rejects schemas with more than MAX_REINFORCE_ITEMS_PER_CALL items', async () => {
      // The zod schema enforces the cap at parse time, which happens before the handler.
      // We test this at the schema validation level by passing too many items.
      const activeSet = new ActiveMemorySet();
      const tool = createReinforceTool({ getActiveMemorySet: () => activeSet });

      const tooManyItems = Array.from(
        { length: ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_CALL + 1 },
        (_, i) => makeItem(`mem-${i}`)
      );

      // Zod will reject this during schema validation, before the handler runs.
      // We verify the schema max constraint directly.
      const parseResult = tool.schema.safeParse({ items: tooManyItems });
      expect(parseResult.success).toBe(false);
    });
  });

  describe('per-round cap enforcement', () => {
    it('stops accepting items once the round cap is reached', async () => {
      const activeSet = new ActiveMemorySet();
      const tool = createReinforceTool({ getActiveMemorySet: () => activeSet });
      const context = makeContext();

      // Fill up the round cap in batches of MAX_REINFORCE_ITEMS_PER_CALL
      const batchSize = ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_CALL;
      const fullBatch = Array.from({ length: batchSize }, (_, i) => makeItem(`mem-${i}`));

      // Two full batches = 40 items = exactly at the cap
      await tool.handler({ items: fullBatch }, context);
      await tool.handler({ items: fullBatch }, context);

      expect(activeSet.getReinforceItemCount()).toBe(ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_ROUND);

      // The third call should return 0 processed
      const result = await tool.handler({ items: [makeItem('extra-001')] }, context);
      const data = (result as any).results[0].data;

      expect(data.processed).toBe(0);
      expect(data.skipped).toBe(1);
      expect(data).toHaveProperty('reason');
    });

    it('accepts partial items when partially over the cap', async () => {
      const activeSet = new ActiveMemorySet();
      const tool = createReinforceTool({ getActiveMemorySet: () => activeSet });
      const context = makeContext();

      // Fill to 38 items first (2 below cap)
      const batch38 = Array.from({ length: 38 }, (_, i) => makeItem(`mem-${i}`));
      await tool.handler({ items: batch38 }, context);

      expect(activeSet.getReinforceItemCount()).toBe(38);

      // Now send 5 items — only 2 should be accepted (cap = 40)
      const batch5 = Array.from({ length: 5 }, (_, i) => makeItem(`extra-${i}`));
      const result = await tool.handler({ items: batch5 }, context);
      const data = (result as any).results[0].data;

      expect(data.processed).toBe(2);
      expect(data.skipped).toBe(3);
      expect(activeSet.getReinforceItemCount()).toBe(40);
    });

    it('tracks round_total and round_remaining accurately', async () => {
      const activeSet = new ActiveMemorySet();
      const tool = createReinforceTool({ getActiveMemorySet: () => activeSet });
      const context = makeContext();

      const result = await tool.handler(
        { items: [makeItem('mem-001'), makeItem('mem-002')] },
        context
      );

      const data = (result as any).results[0].data;
      expect(data.round_total).toBe(2);
      expect(data.round_remaining).toBe(ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_ROUND - 2);
    });
  });

  describe('all feedback kinds', () => {
    const allKinds = [
      'useful',
      'unused',
      'irrelevant',
      'misleading',
      'incorrect',
      'outdated',
      'duplicate',
      'needs_update',
    ] as const;

    for (const kind of allKinds) {
      it(`accepts kind="${kind}"`, async () => {
        const activeSet = new ActiveMemorySet();
        const tool = createReinforceTool({ getActiveMemorySet: () => activeSet });
        const context = makeContext();

        const result = await tool.handler(
          { items: [{ memory_id: 'mem-001', effect: 'positive', kind }] },
          context
        );

        const data = (result as any).results[0].data;
        expect(data.processed).toBe(1);

        const signals = activeSet.getSignals();
        expect(signals[signals.length - 1].kind).toBe(kind);
      });
    }
  });
});
