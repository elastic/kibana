/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { ReinforcementSignal } from '../active_memory_set';
import { ActiveMemorySet } from '../active_memory_set';

/** Tool ID for the memory reinforce tool. */
export const MEMORY_REINFORCE_TOOL_ID = 'memory.reinforce';

/**
 * Schema for a single reinforcement item.
 */
const reinforcementItemSchema = z.object({
  memory_id: z
    .string()
    .min(1)
    .max(128)
    .describe('The unique ID of the memory node to provide feedback for.'),
  effect: z
    .enum(['positive', 'negative'])
    .describe(
      'Direction of the feedback signal. ' +
        'positive: the memory was accurate and helpful. ' +
        'negative: the memory was problematic (misleading, incorrect, outdated, etc.).'
    ),
  kind: z
    .enum([
      'useful',
      'unused',
      'irrelevant',
      'misleading',
      'incorrect',
      'outdated',
      'duplicate',
      'needs_update',
    ])
    .describe(
      'Specific nature of the feedback: ' +
        'useful: memory helped accomplish the task. ' +
        'unused: memory was retrieved but not needed. ' +
        'irrelevant: memory was not applicable to the current goal. ' +
        'misleading: memory led the agent in the wrong direction. ' +
        'incorrect: memory content was factually wrong. ' +
        'outdated: memory was previously accurate but is now stale. ' +
        'duplicate: memory is redundant with another. ' +
        'needs_update: memory is partially correct but requires updating.'
    ),
  reason: z
    .string()
    .max(300)
    .optional()
    .describe('Optional human-readable explanation for the feedback signal.'),
});

/**
 * Request schema for reinforce().
 */
const reinforceSchema = z.object({
  items: z
    .array(reinforcementItemSchema)
    .min(1)
    .max(ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_CALL)
    .describe(
      `List of reinforcement signals to apply. ` +
        `Maximum ${ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_CALL} items per call, ` +
        `${ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_ROUND} total per round. ` +
        `Signals are advisory — they are batched and applied globally after the round ends.`
    ),
});

/**
 * Options for creating the reinforce tool.
 */
export interface ReinforceToolOptions {
  /** Lazy getter for the active memory set for the current round. */
  getActiveMemorySet: () => ActiveMemorySet;
}

/**
 * Creates the memory.reinforce tool.
 *
 * Advisory batching: enqueues reinforcement signals in the ActiveMemorySet.
 * Global mutation is NOT applied immediately — signals are processed post-round.
 *
 * Caps:
 * - 20 items per call (enforced by schema)
 * - 40 items per round (enforced by ActiveMemorySet)
 */
export const createReinforceTool = ({
  getActiveMemorySet,
}: ReinforceToolOptions): BuiltinToolDefinition<typeof reinforceSchema> => ({
  id: MEMORY_REINFORCE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Provide feedback signals for memory nodes retrieved during this round. ' +
    'Signals are advisory and batched — they are applied to the memory system after the round ' +
    'ends and influence future retrieval and consolidation. ' +
    'Use positive signals for memories that were accurate and helpful. ' +
    'Use negative signals for memories that were misleading, incorrect, or outdated. ' +
    `Maximum ${ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_CALL} items per call, ` +
    `${ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_ROUND} total per round.`,
  schema: reinforceSchema,
  tags: ['memory', 'system'],
  handler: async ({ items }, context) => {
    const activeSet = getActiveMemorySet();

    // Enforce per-round cap
    const currentCount = activeSet.getReinforceItemCount();
    const remainingCapacity =
      ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_ROUND - currentCount;

    if (remainingCapacity <= 0) {
      context.logger.warn(
        `memory.reinforce: round cap of ${ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_ROUND} already reached.`
      );
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              processed: 0,
              skipped: items.length,
              reason: `Round cap of ${ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_ROUND} reinforce items already reached.`,
            },
          },
        ],
      };
    }

    // Accept up to the remaining capacity
    const itemsToProcess = items.slice(0, remainingCapacity);
    const skipped = items.length - itemsToProcess.length;

    // Record the count
    const accepted = activeSet.recordReinforceItems(itemsToProcess.length);

    // Enqueue each signal into the active set
    for (const item of itemsToProcess.slice(0, accepted)) {
      const signal: ReinforcementSignal = {
        memory_id: item.memory_id,
        effect: item.effect,
        kind: item.kind,
        reason: item.reason,
      };
      activeSet.markReinforced(signal);
    }

    context.logger.debug(
      `memory.reinforce: enqueued ${accepted} signals (${skipped} skipped, ` +
        `${activeSet.getReinforceItemCount()}/${ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_ROUND} round total)`
    );

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            processed: accepted,
            skipped: skipped + (itemsToProcess.length - accepted),
            round_total: activeSet.getReinforceItemCount(),
            round_remaining:
              ActiveMemorySet.MAX_REINFORCE_ITEMS_PER_ROUND - activeSet.getReinforceItemCount(),
          },
        },
      ],
    };
  },
});
