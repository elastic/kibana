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
import { runRetrieval } from '../retrieval/run_retrieval';

/** Tool ID for the memory checkpoint tool. */
export const MEMORY_CHECKPOINT_TOOL_ID = 'memory.checkpoint';

/**
 * Request schema for checkpoint().
 */
const checkpointSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(500)
    .describe(
      'Search query for memory retrieval. Provide keywords or a short phrase describing what to look up in memory.'
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
  /** Retrieval method to use (e.g. 'bm25'). */
  retrievalMethod: string;
  /** Full plugin config for retrieval context. */
  getConfig: () => import('../../../config').AgentBuilderConfig;
  /** Lazy getter for internal services (esClient, inference, etc.). */
  getInternalServices: () => import('../../types').InternalStartServices;
}

/**
 * Creates the memory.checkpoint tool.
 *
 * A blocking memory retrieval tool. The agent can call this explicitly to search
 * for memories. In normal operation, memory retrieval happens automatically via
 * _reasoning on tool calls — this tool is for when the agent wants to do a
 * dedicated memory search.
 */
export const createCheckpointTool = ({
  getMemoryService,
  getActiveMemorySet,
  retrievalMethod,
  getConfig,
  getInternalServices,
}: CheckpointToolOptions): BuiltinToolDefinition<typeof checkpointSchema> => ({
  id: MEMORY_CHECKPOINT_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Search long-term memory for relevant context. Returns memories matching the query. ' +
    'Memory retrieval also happens automatically when you call other tools (via _reasoning), ' +
    'so only call this directly when you need a dedicated memory search.',
  schema: checkpointSchema,
  tags: ['memory', 'system'],
  handler: async ({ query }, context) => {
    const memoryService = getMemoryService();
    const activeSet = getActiveMemorySet();
    const memoryClient = await memoryService.getScopedClient({ request: context.request });

    let retrievedMemories: MemoryNode[];
    try {
      const services = getInternalServices();
      const config = getConfig();
      retrievedMemories = await runRetrieval(retrievalMethod, memoryClient, query, context.logger, {
        stage: 'tool_checkpoint',
        size: 10,
        esClient: services.elasticsearch.client.asInternalUser,
        space: '',
        config,
        inference: services.inference,
        request: context.request,
        connectorId: config.memory.extraction.connectorId,
      });
    } catch (err) {
      context.logger.warn(`memory.checkpoint: retrieval failed — ${(err as Error).message}`);
      retrievedMemories = [];
    }

    const existingIds = new Set(activeSet.getAllRetrieved().map((m) => m.id));
    activeSet.addAllRetrieved(retrievedMemories);
    const newMemories = retrievedMemories.filter((m) => !existingIds.has(m.id));

    for (const m of newMemories) {
      activeSet.addInjectedTokens(ActiveMemorySet.estimateTokens(m.summary));
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            memories: newMemories.map((m) => ({
              id: m.id,
              summary: m.summary,
              type: m.type,
              subtype: m.subtype,
              confidence: m.confidence,
            })),
            total_retrieved: activeSet.getAllRetrieved().length,
          },
        },
      ],
    };
  },
});
