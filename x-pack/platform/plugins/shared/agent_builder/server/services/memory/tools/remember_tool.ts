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
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { MemoryNode } from '@kbn/agent-builder-common';
import type { MemoryService } from '../memory_service';
import { ActiveMemorySet } from '../active_memory_set';
import { createGraphTraversalService } from '../graph/graph_traversal';

/** Tool ID for the memory remember tool. */
export const MEMORY_REMEMBER_TOOL_ID = 'memory.remember';

/**
 * Request schema for remember().
 */
const rememberSchema = z.object({
  memory_id: z
    .string()
    .min(1)
    .max(128)
    .optional()
    .describe('The unique ID of a specific memory node to retrieve. Provide either memory_id or query, not both.'),
  query: z
    .string()
    .min(1)
    .max(500)
    .optional()
    .describe('A text query to search memories by content. Returns the top matching memory and its neighbors. Provide either memory_id or query, not both.'),
  full: z
    .boolean()
    .describe(
      'When true: return the full memory content (up to ~500 tokens) and apply a stronger ' +
        'reinforcement bump (reinforcement_score += 0.05). ' +
        'When false: return only the summary (up to ~100 tokens) with a lighter access bump.'
    ),
});

/**
 * Options for creating the remember tool.
 */
export interface RememberToolOptions {
  /** Lazy getter for the memory service. */
  getMemoryService: () => MemoryService;
  /** Lazy getter for the active memory set for the current round. */
  getActiveMemorySet: () => ActiveMemorySet;
}

/**
 * Creates the memory.remember tool.
 *
 * Fetches a specific memory by ID (full or summary mode) and returns up to 5
 * graph neighbors for context expansion.
 *
 * Access bumps:
 * - summary read (full=false): access_count++, recency=now
 * - full read (full=true): access_count++, recency=now, reinforcement_score += 0.05
 *
 * Capped at 10 calls per round.
 */
export const createRememberTool = ({
  getMemoryService,
  getActiveMemorySet,
}: RememberToolOptions): BuiltinToolDefinition<typeof rememberSchema> => ({
  id: MEMORY_REMEMBER_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Retrieve a memory by ID or search by text query, with optional full content and neighboring memories. ' +
    'Use this to expand on a memory surfaced during retrieval, or to search for memories by topic. ' +
    'Provide either memory_id (for a specific memory) or query (to search by content). ' +
    'Returns the memory content and up to 5 related memories from the knowledge graph. ' +
    'full=true returns complete content (~500 tokens) with stronger reinforcement. Capped at 10 calls per round.',
  schema: rememberSchema,
  tags: ['memory', 'system'],
  handler: async ({ memory_id: memoryId, query, full }, context) => {
    if (!memoryId && !query) {
      return {
        results: [
          createErrorResult({
            message: 'Either memory_id or query must be provided.',
          }),
        ],
      };
    }

    const activeSet = getActiveMemorySet();

    // Enforce per-round call cap
    const allowed = activeSet.recordRememberCall();
    if (!allowed) {
      return {
        results: [
          createErrorResult({
            message: `remember() cap reached: maximum ${ActiveMemorySet.MAX_REMEMBER_CALLS} calls per round allowed.`,
            metadata: { memory_id: memoryId },
          }),
        ],
      };
    }

    const memoryService = getMemoryService();
    const memoryClient = await memoryService.getScopedClient({ request: context.request });

    // Resolve the target memory — either by ID or by search query
    let memory: MemoryNode;
    if (memoryId) {
      try {
        memory = await memoryClient.get(memoryId);
      } catch (err) {
        return {
          results: [
            createErrorResult({
              message: `Memory not found: ${memoryId}`,
              metadata: { memory_id: memoryId },
            }),
          ],
        };
      }
    } else {
      try {
        const searchResults = await memoryClient.search(query!, {
          status: ['candidate', 'provisional', 'established', 'consolidated'],
          size: 1,
        });
        if (searchResults.length === 0) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  memory: null,
                  related: [],
                  message: `No memories found matching query: "${query}"`,
                },
              },
            ],
          };
        }
        memory = searchResults[0];
      } catch (err) {
        return {
          results: [
            createErrorResult({
              message: `Memory search failed: ${(err as Error).message}`,
              metadata: { query },
            }),
          ],
        };
      }
    }

    // Apply access bump (best-effort)
    const resolvedId = memory.id;
    const now = new Date().toISOString();
    const updatePayload: Parameters<typeof memoryClient.update>[0] = {
      id: resolvedId,
      access_count: (memory.access_count ?? 0) + 1,
      recency: now,
      last_used_at: now,
    };

    if (full) {
      // Full read: additionally bump reinforcement_score by 0.05
      updatePayload.reinforcement_score = Math.min(
        1.0,
        (memory.reinforcement_score ?? 0) + 0.05
      );
    }

    memoryClient.update(updatePayload).catch((err: Error) => {
      context.logger.warn(`memory.remember: access bump failed for ${resolvedId}: ${err.message}`);
    });

    // Mark as used in the active set and add to retrieved
    activeSet.addRetrieved(memory);
    activeSet.markUsed(resolvedId);

    // Fetch up to 5 graph neighbors for context expansion
    const graphService = createGraphTraversalService({ client: memoryClient, logger: context.logger });
    let neighbors: MemoryNode[];
    try {
      neighbors = await graphService.getNeighbors(resolvedId, {
        depth: 1,
        maxResults: 5,
        includeFull: false,
      });
    } catch (err) {
      context.logger.warn(
        `memory.remember: neighbor fetch failed for ${resolvedId}: ${(err as Error).message}`
      );
      neighbors = [];
    }

    // Determine what content to return based on full flag
    const memoryContent = full
      ? { id: memory.id, summary: memory.summary, full: memory.full }
      : { id: memory.id, summary: memory.summary };

    // Build related items from neighbors
    const related = neighbors.map((neighbor) => {
      const link = memory.links.find((l) => l.target_id === neighbor.id);
      return {
        id: neighbor.id,
        summary: neighbor.summary,
        relation: link ? link.type : 'related_to',
      };
    });

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            memory: memoryContent,
            related,
          },
        },
      ],
    };
  },
});
