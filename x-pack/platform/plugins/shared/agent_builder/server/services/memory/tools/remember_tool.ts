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
import { runRetrieval } from '../retrieval/run_retrieval';
import { appendInjectedMemories } from '../hooks/before_agent_hook';

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
    .describe('The unique ID of a specific memory to read in full.'),
  query: z
    .string()
    .min(1)
    .max(500)
    .optional()
    .describe('A text query to search memories by content.'),
  around_id: z
    .string()
    .min(1)
    .max(128)
    .optional()
    .describe('A memory ID to search around. Returns memories created near this memory in time. Combine with query to search only nearby memories.'),
  hops: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .describe('How many memories before and after around_id to include. Defaults to 10.'),
  full: z
    .boolean()
    .optional()
    .describe(
      'When true: return full memory content. When false (default): return summaries only.'
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
  /** Retrieval method to use for query-based search (e.g. 'bm25'). */
  retrievalMethod: string;
  /** Full plugin config for retrieval context. */
  getConfig: () => import('../../../config').AgentBuilderConfig;
  /** Lazy getter for internal services (esClient, inference, etc.). */
  getInternalServices: () => import('../../types').InternalStartServices;
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
  retrievalMethod,
  getConfig,
  getInternalServices,
}: RememberToolOptions): BuiltinToolDefinition<typeof rememberSchema> => ({
  id: MEMORY_REMEMBER_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Retrieve memories. Use memory_id to read a specific memory. Use query to search by keyword. ' +
    'Use around_id to browse memories near a specific memory in time (combine with query to search nearby). ' +
    'Use hops to control how many memories before/after to include (default 10).',
  schema: rememberSchema,
  tags: ['memory', 'system'],
  handler: async ({ memory_id: memoryId, query, around_id: aroundId, hops = 10, full }, context) => {
    if (!memoryId && !query && !aroundId) {
      return {
        results: [
          createErrorResult({
            message: 'Provide at least one of: memory_id, query, or around_id.',
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

    // Mode 1: around_id — browse/search memories near a specific memory in time
    if (aroundId) {
      let anchorMemory: MemoryNode;
      try {
        anchorMemory = await memoryClient.get(aroundId);
      } catch {
        return {
          results: [createErrorResult({ message: `Anchor memory not found: ${aroundId}` })],
        };
      }

      const anchorTime = anchorMemory.created_at;

      const services = getInternalServices();
      const esClient = services.elasticsearch.client.asInternalUser;
      const { memoryIndexName } = await import('../client/storage');

      try {
        // When a query is provided, run semantic/hybrid retrieval scoped to the
        // time window around the anchor memory instead of a plain keyword filter.
        if (query) {
          const config = getConfig();
          const searchResults = await runRetrieval(
            retrievalMethod,
            memoryClient,
            query,
            context.logger,
            {
              size: hops * 2,
              esClient,
              space: '',
              config,
              inference: services.inference,
              request: context.request,
              connectorId: config.memory.extraction.connectorId,
            }
          );

          // Also fetch timestamp-based neighbors for context
          const [beforeRes, afterRes] = await Promise.all([
            esClient.search({
              index: memoryIndexName,
              size: hops,
              query: { bool: { filter: [{ range: { created_at: { lt: anchorTime } } }] } },
              sort: [{ created_at: { order: 'desc' } }],
            }),
            esClient.search({
              index: memoryIndexName,
              size: hops,
              query: { bool: { filter: [{ range: { created_at: { gt: anchorTime } } }] } },
              sort: [{ created_at: { order: 'asc' } }],
            }),
          ]);

          // Merge: timestamp neighbors + semantic results, deduplicated
          const nearbyIds = new Set<string>();
          const nearby: Array<{ id: string; summary: string; type: string; created_at: string }> = [];

          const addNode = (id: string, summary: string, type: string, createdAt: string) => {
            if (nearbyIds.has(id)) return;
            nearbyIds.add(id);
            nearby.push({ id, summary, type, created_at: createdAt });
          };

          // Add timestamp neighbors
          for (const hit of (beforeRes.hits.hits as any[]).reverse()) {
            addNode(hit._id, hit._source?.summary ?? '', hit._source?.type ?? '', hit._source?.created_at ?? '');
          }
          addNode(anchorMemory.id, `>>> ${anchorMemory.summary}`, anchorMemory.type, anchorMemory.created_at);
          for (const hit of afterRes.hits.hits as any[]) {
            addNode(hit._id, hit._source?.summary ?? '', hit._source?.type ?? '', hit._source?.created_at ?? '');
          }

          // Add semantic/hybrid results (these may include temporally distant but relevant memories)
          for (const node of searchResults) {
            addNode(node.id, node.summary, node.type, node.created_at);
          }

          // Sort by timestamp so the timeline makes sense
          nearby.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));

          appendInjectedMemories(context.request, nearby);

          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.other,
                data: {
                  anchor: { id: anchorMemory.id, summary: anchorMemory.summary, created_at: anchorMemory.created_at },
                  nearby: nearby.map((m) => ({
                    id: m.id,
                    summary: m.summary,
                    type: m.type,
                    created_at: m.created_at,
                  })),
                  total_nearby: nearby.length,
                },
              },
            ],
          };
        }

        // No query — pure timestamp-based proximity search
        const [beforeRes, afterRes] = await Promise.all([
          esClient.search({
            index: memoryIndexName,
            size: hops,
            query: { bool: { filter: [{ range: { created_at: { lt: anchorTime } } }] } },
            sort: [{ created_at: { order: 'desc' } }],
          }),
          esClient.search({
            index: memoryIndexName,
            size: hops,
            query: { bool: { filter: [{ range: { created_at: { gt: anchorTime } } }] } },
            sort: [{ created_at: { order: 'asc' } }],
          }),
        ]);

        const nearbyIds = new Set<string>();
        const nearby: Array<{ id: string; summary: string; type: string; created_at: string }> = [];

        const processHits = (hits: any[]) => {
          for (const hit of hits) {
            if (nearbyIds.has(hit._id)) continue;
            nearbyIds.add(hit._id);
            nearby.push({
              id: hit._id,
              summary: hit._source?.summary ?? '',
              type: hit._source?.type ?? '',
              created_at: hit._source?.created_at ?? '',
            });
          }
        };

        processHits((beforeRes.hits.hits as any[]).reverse());
        nearby.push({
          id: anchorMemory.id,
          summary: `>>> ${anchorMemory.summary}`,
          type: anchorMemory.type,
          created_at: anchorMemory.created_at,
        });
        processHits(afterRes.hits.hits as any[]);

        appendInjectedMemories(context.request, nearby);

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                anchor: { id: anchorMemory.id, summary: anchorMemory.summary, created_at: anchorMemory.created_at },
                nearby: nearby.map((m) => ({
                  id: m.id,
                  summary: m.summary,
                  type: m.type,
                  created_at: m.created_at,
                })),
                total_nearby: nearby.length,
              },
            },
          ],
        };
      } catch (err) {
        return {
          results: [createErrorResult({ message: `Nearby search failed: ${(err as Error).message}` })],
        };
      }
    }

    // Mode 2: memory_id — read a specific memory
    // Mode 3: query — search memories by content
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
    } else if (query) {
      try {
        const services = getInternalServices();
        const config = getConfig();
        const searchResults = await runRetrieval(retrievalMethod, memoryClient, query, context.logger, {
          size: 1,
          esClient: services.elasticsearch.client.asInternalUser,
          space: '',
          config,
          inference: services.inference,
          request: context.request,
          connectorId: config.memory.extraction.connectorId,
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
    } else {
      return {
        results: [createErrorResult({ message: 'Provide memory_id, query, or around_id.' })],
      };
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
      ? { id: memory.id, summary: memory.summary, full: memory.full, created_at: memory.created_at }
      : { id: memory.id, summary: memory.summary, created_at: memory.created_at };

    // Build related items from neighbors
    const related = neighbors.map((neighbor) => {
      const link = memory.links.find((l) => l.target_id === neighbor.id);
      return {
        id: neighbor.id,
        summary: neighbor.summary,
        created_at: neighbor.created_at,
        relation: link ? link.type : 'related_to',
      };
    });

    // Track all memories surfaced by this tool call
    appendInjectedMemories(context.request, [
      { id: memory.id, type: memory.type, summary: memory.summary, created_at: memory.created_at },
      ...neighbors.map((n) => ({ id: n.id, type: n.type, summary: n.summary, created_at: n.created_at })),
    ]);

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
