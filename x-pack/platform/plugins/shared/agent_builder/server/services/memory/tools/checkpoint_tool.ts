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
import type { MemoryNode } from '@kbn/agent-builder-common';
import type { MemoryService } from '../memory_service';
import { ActiveMemorySet } from '../active_memory_set';

/** Tool ID for the memory checkpoint tool. */
export const MEMORY_CHECKPOINT_TOOL_ID = 'memory.checkpoint';

/**
 * Request schema for checkpoint().
 */
const checkpointSchema = z.object({
  goal: z
    .string()
    .min(1)
    .max(500)
    .describe(
      'The current goal or task the agent is working towards. Used to score memory relevance.'
    ),
  missing_info: z
    .string()
    .max(500)
    .optional()
    .describe(
      'Optional description of information the agent still needs. Helps focus retrieval.'
    ),
  next_tool: z
    .string()
    .max(128)
    .optional()
    .describe(
      'ID of the next tool the agent plans to call. Provides context for retrieval scoring.'
    ),
  query_hint: z
    .string()
    .max(500)
    .optional()
    .describe(
      'Optional search hint for memory retrieval (used when final=false). ' +
        'Provide keywords or a short phrase that best describes what to look up in memory.'
    ),
  final: z
    .boolean()
    .describe(
      'When false: retrieve additional memories relevant to the current goal and return newly found ones. ' +
        'When true: compile the final memory bundle for this round — return all memories used, ' +
        'sorted by utility. Do NOT retrieve new memories when final=true.'
    ),
});

/**
 * Options for creating the checkpoint tool.
 */
export interface CheckpointToolOptions {
  /** Lazy getter for the memory service. */
  getMemoryService: () => MemoryService;
  /** Lazy getter for the active memory set for the current round. */
  getActiveMemorySet: () => ActiveMemorySet;
}

/**
 * Creates the memory.checkpoint tool.
 *
 * - final=false: run retrieval at tool_checkpoint stage, return newly retrieved memories
 *   not yet in the active set.
 * - final=true: compile the final memory bundle, return all memories used this round
 *   sorted by utility. Does NOT retrieve new memories.
 */
export const createCheckpointTool = ({
  getMemoryService,
  getActiveMemorySet,
}: CheckpointToolOptions): BuiltinToolDefinition<typeof checkpointSchema> => ({
  id: MEMORY_CHECKPOINT_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Memory system checkpoint. Call at key decision points during an agent round. ' +
    'When final=false: retrieves additional memories relevant to the current goal and returns ' +
    'newly found memories not yet available in context. ' +
    'When final=true: compiles the final memory bundle for this round, returning all memories ' +
    'used sorted by utility. Must be called with final=true at the end of every round before ' +
    'delivering the final answer.',
  schema: checkpointSchema,
  tags: ['memory', 'system'],
  handler: async ({ goal, missing_info: missingInfo, query_hint: queryHint, final }, context) => {
    const memoryService = getMemoryService();
    const activeSet = getActiveMemorySet();

    if (final) {
      // Compile the final bundle — do NOT retrieve new memories
      const bundle = activeSet.toBundle();

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              memory_state: {
                used_count: bundle.used.length,
                unused_count: bundle.unused.length,
                signal_count: bundle.signals.length,
                injected_token_count: bundle.injected_token_count,
              },
              used_memories: bundle.used.map((m) => ({
                id: m.id,
                summary: m.summary,
                type: m.type,
                utility: m.utility,
                reinforced: m.reinforced,
              })),
              unused_memories: bundle.unused.map((m) => ({
                id: m.id,
                summary: m.summary,
                type: m.type,
                utility: m.utility,
              })),
              candidate_memories: activeSet.getAllCandidates().map((m) => ({
                id: m.id,
                summary: m.summary,
                type: m.type,
              })),
            },
          },
        ],
      };
    }

    // final=false: retrieve memories at tool_checkpoint stage
    const memoryClient = await memoryService.getScopedClient({ request: context.request });

    // Build the search query from goal + query_hint + missing_info
    const searchParts = [goal];
    if (queryHint) {
      searchParts.push(queryHint);
    }
    if (missingInfo) {
      searchParts.push(missingInfo);
    }
    const searchQuery = searchParts.join(' ');

    let retrievedMemories: MemoryNode[];
    try {
      retrievedMemories = await memoryClient.search(searchQuery, {
        stage: 'tool_checkpoint',
        size: 10,
      });
    } catch (err) {
      context.logger.warn(
        `memory.checkpoint: retrieval failed — ${(err as Error).message}`
      );
      retrievedMemories = [];
    }

    // Track which IDs were already in the active set before this call
    const existingIds = new Set(activeSet.getAllRetrieved().map((m) => m.id));

    // Add all retrieved to the active set
    activeSet.addAllRetrieved(retrievedMemories);

    // Return only newly retrieved memories (not yet in active set before this call)
    const newMemories = retrievedMemories.filter((m) => !existingIds.has(m.id));

    // Update injected token budget
    for (const m of newMemories) {
      activeSet.addInjectedTokens(ActiveMemorySet.estimateTokens(m.summary));
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            new_memories: newMemories.map((m) => ({
              id: m.id,
              summary: m.summary,
              type: m.type,
              subtype: m.subtype,
              utility: m.utility,
              confidence: m.confidence,
            })),
            memory_state: {
              total_retrieved: activeSet.getAllRetrieved().length,
              injected_token_count: activeSet.getInjectedTokenCount(),
            },
            candidate_memories: activeSet.getAllCandidates().map((m) => ({
              id: m.id,
              summary: m.summary,
              type: m.type,
            })),
          },
        },
      ],
    };
  },
});
