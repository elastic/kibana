/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type { HookHandlerResult } from '@kbn/agent-builder-server';
import type { BeforeAgentHookContext } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { MemoryNode } from '@kbn/agent-builder-common';
import type { InternalSetupServices, InternalStartServices } from '../../types';
import { getCurrentSpaceId } from '../../../utils/spaces';
import { ActiveMemorySet } from '../active_memory_set';
import type { ScoredMemoryNode } from '../retrieval/scoring';
import { scoreMemoryNode, DEFAULT_RETRIEVAL_CONFIG } from '../retrieval/scoring';
import type { AgentBuilderConfig } from '../../../config';
import { getTokenBudgetForStage } from '../retrieval/retrieval_service';
import { runRetrieval } from '../retrieval/run_retrieval';
import { getMemoryPreloader } from '../preload/memory_preloader';

/**
 * Deps needed to register the before-agent memory injection hook.
 */
export interface MemoryRetrievalConfig {
  roundStartEnabled: boolean;
  roundStartBlocking: boolean;
  method: string;
}

export interface RegisterMemoryBeforeAgentHookDeps {
  logger: Logger;
  retrieval: MemoryRetrievalConfig;
  config: AgentBuilderConfig;
  getInternalServices: () => InternalStartServices;
}

/**
 * Format a list of scored memory nodes into the injection block for the system prompt.
 *
 * Example output:
 * ```
 * ## Active Memories
 * [mem_001] (semantic) User prefers TypeScript over JavaScript. [confidence: 0.9]
 * [mem_002] (procedural) Always add tests for new API endpoints. [confidence: 0.8]
 * ```
 */
const MEMORY_INSTRUCTIONS =
  'You can explore these memories further:\n' +
  '- Read full memory: remember(memory_id)\n' +
  '- Search memories by keyword: remember(query="keyword")\n' +
  '- Search around a specific memory: remember(query="keyword", around_id="memory_id", hops=10)\n' +
  '- Browse nearby memories without search: remember(around_id="memory_id", hops=10)';

export const formatMemoryInjection = (nodes: ScoredMemoryNode[]): string => {
  if (nodes.length === 0) {
    return '';
  }

  const lines: string[] = ['## Retrieved Memories'];
  for (const { node } of nodes) {
    const timestamp = node.created_at
      ? new Date(node.created_at).toISOString().slice(0, 16).replace('T', ' ')
      : '';
    lines.push(`[${node.id}] (${node.type}) ${timestamp} — ${node.summary}`);
  }

  lines.push('');
  lines.push(MEMORY_INSTRUCTIONS);

  return lines.join('\n');
};

/**
 * Inject memory bundle into the user message by prepending a memory context block.
 *
 * When there are active memories, the message is prepended with:
 * ```
 * [Memory Context]
 * ## Active Memories
 * [mem_001] ...
 *
 * <original message>
 * ```
 */
export const injectMemoryIntoMessage = (message: string, memoryBundle: string): string => {
  if (!memoryBundle) {
    return message;
  }
  return `[Memory Context]\n${memoryBundle}\n\n${message}`;
};

/**
 * Score a list of MemoryNode results from BM25 search and apply token budget.
 *
 * Uses the composite scoring formula with BM25 relevance scores normalized
 * against the maximum score. Applies the round_start token budget.
 */
const scoreAndBudgetNodes = (
  nodes: MemoryNode[],
  maxScore: number,
  logger: Logger
): ScoredMemoryNode[] => {
  const stage = 'round_start';
  const tokenBudget = getTokenBudgetForStage(stage);
  const now = Date.now();

  const selectedSummaries: string[] = [];
  const result: ScoredMemoryNode[] = [];
  let usedTokens = 0;

  // Score all nodes first (using BM25 relevance as a proxy — we don't have raw scores here,
  // so we use uniform relevance = 0.5 as BM25 score normalization is done inside MemoryClient)
  const scored = nodes.map((node, idx) => {
    // Use position-based relevance proxy: earlier results have higher relevance
    const positionRelevance = maxScore > 0 ? Math.max(0, 1 - idx * 0.05) : 0.5;
    return scoreMemoryNode({
      node,
      relevanceScore: positionRelevance,
      stage,
      now,
      selectedSummaries: [...selectedSummaries],
      config: DEFAULT_RETRIEVAL_CONFIG,
    });
  });

  // Sort by composite score descending
  scored.sort((a, b) => b.score - a.score);

  for (const scoredNode of scored) {
    const tokens = ActiveMemorySet.estimateTokens(scoredNode.node.summary);
    if (usedTokens + tokens > tokenBudget) {
      continue;
    }
    result.push(scoredNode);
    selectedSummaries.push(scoredNode.node.summary);
    usedTokens += tokens;
  }

  logger.debug(
    `memory.beforeAgent: ${result.length}/${nodes.length} memories fit token budget=${tokenBudget}, used=${usedTokens} tokens`
  );

  return result;
};

/**
 * The handler for the beforeAgent hook.
 *
 * 1. Resolves a scoped MemoryClient from MemoryService (handles user + space scoping).
 * 2. Runs BM25 retrieval at 'round_start' stage using the user's query.
 * 3. Applies composite scoring + token budget to select memories.
 * 4. Injects the memory bundle into the user message (prepends context block).
 * 5. Returns updated nextInput with the enriched message.
 *
 * If retrieval fails or returns no results, the hook returns undefined (no change).
 * Errors are caught and logged; the hook never aborts agent execution.
 */
export const runMemoryBeforeAgentHook = async (
  context: BeforeAgentHookContext,
  deps: RegisterMemoryBeforeAgentHookDeps
): Promise<void | HookHandlerResult<HookLifecycle.beforeAgent>> => {
  const { logger, retrieval, getInternalServices } = deps;

  if (!retrieval.roundStartEnabled) {
    logger.info('memory.beforeAgent: round-start retrieval disabled via config');
    return;
  }

  logger.info(`memory.beforeAgent: using retrieval method="${retrieval.method}"`);

  let services: InternalStartServices;
  try {
    services = getInternalServices();
  } catch (err) {
    logger.warn(`memory.beforeAgent: services not yet available — ${(err as Error).message}`);
    return;
  }

  const { memory, spaces, inference, conversations } = services;

  const query = context.nextInput.message;

  if (!query) {
    logger.info('memory.beforeAgent: no message in nextInput, skipping retrieval');
    return;
  }

  const startTime = Date.now();

  // Get a scoped memory client — this handles user + space isolation internally
  let memoryClient;
  try {
    memoryClient = await memory.getScopedClient({ request: context.request });
  } catch (err) {
    logger.warn(`memory.beforeAgent: could not create memory client — ${(err as Error).message}`);
    return;
  }

  // Check for preloaded memories first (instant, no search needed)
  const preloader = getMemoryPreloader();
  let preloadedNodes: MemoryNode[] = [];
  if (preloader) {
    // Try to get user identifier for cache lookup
    const userName = (context.request.headers?.['x-forwarded-user'] as string) ?? '';
    preloadedNodes = preloader.consume(userName);
    if (preloadedNodes.length > 0) {
      logger.info(
        `memory.beforeAgent: using ${preloadedNodes.length} preloaded memories (0ms)`
      );
    }
  }

  let retrievedNodes: MemoryNode[] = preloadedNodes;

  // If no preloaded memories, do a live search
  if (retrievedNodes.length === 0) {
    try {
      const space = getCurrentSpaceId({ request: context.request, spaces });

      const convClient = await conversations.getScopedClient({ request: context.request });

      retrievedNodes = await runRetrieval(retrieval.method, memoryClient, query, logger, {
        stage: 'round_start',
        size: 20,
        esClient: services.elasticsearch.client.asInternalUser,
        space,
        userName: '',
        config: deps.config,
        inference,
        request: context.request,
        connectorId: deps.config.memory.extraction.connectorId,
        loadConversation: async (id: string) => {
          try {
            return await convClient.get(id);
          } catch {
            return undefined;
          }
        },
      });
    } catch (err) {
      logger.warn(`memory.beforeAgent: retrieval failed — ${(err as Error).message}`);
      return;
    }

    const searchDuration = Date.now() - startTime;

    if (retrievedNodes.length === 0) {
      logger.info(`memory.beforeAgent: no memories found (search took ${searchDuration}ms)`);
      return;
    }

    logger.info(
      `memory.beforeAgent: found ${retrievedNodes.length} memories in ${searchDuration}ms`
    );
  }

  // Score and apply token budget
  const scoredNodes = scoreAndBudgetNodes(retrievedNodes, 1.0, logger);

  if (scoredNodes.length === 0) {
    logger.info('memory.beforeAgent: all memories exceeded token budget, skipping injection');
    return;
  }

  // Format the memory bundle as text
  const memoryBundle = formatMemoryInjection(scoredNodes);

  const totalDuration = Date.now() - startTime;
  const space = getCurrentSpaceId({ request: context.request, spaces });
  logger.info(
    `memory.beforeAgent: injected ${scoredNodes.length} memories into message (total ${totalDuration}ms, space=${space})`
  );

  // Inject memory context by prepending to the user message.
  // The agent sees both the memory context and the original message.
  const enrichedMessage = injectMemoryIntoMessage(query, memoryBundle);

  return {
    nextInput: {
      ...context.nextInput,
      message: enrichedMessage,
    },
  };
};

/**
 * Register the memory before-agent hook with the hooks service.
 *
 * This hook runs at the start of every agent round and injects relevant memories
 * from the memory store into the user message context.
 */
export const registerMemoryBeforeAgentHook = (
  serviceSetups: InternalSetupServices,
  deps: RegisterMemoryBeforeAgentHookDeps
): void => {
  const logger = deps.logger.get('memory.beforeAgent');
  const blocking = deps.retrieval.roundStartBlocking;

  if (blocking) {
    // Blocking mode: wait for memories before agent starts
    serviceSetups.hooks.register({
      id: 'memory-round-start-injection',
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.blocking,
          handler: async (context: BeforeAgentHookContext) =>
            runMemoryBeforeAgentHook(context, { ...deps, logger }),
        },
      },
    });
    logger.info('Memory before-agent hook registered (blocking)');
  } else {
    // Non-blocking mode: fire search, results delivered via auto-retrieval
    // hook on first tool call or at handover to answering agent.
    serviceSetups.hooks.register({
      id: 'memory-round-start-injection',
      hooks: {
        [HookLifecycle.beforeAgent]: {
          mode: HookExecutionMode.nonBlocking,
          handler: async (context: BeforeAgentHookContext) => {
            // Import lazily to avoid circular deps
            const { addUndeliveredRetrieval } = await import('./auto_retrieval_hook');

            const { retrieval, getInternalServices, config } = deps;

            if (!retrieval.roundStartEnabled) return;

            const query = context.nextInput.message;
            if (!query) return;

            let services;
            try { services = getInternalServices(); } catch { return; }

            const memoryClient = await services.memory.getScopedClient({ request: context.request });
            const space = getCurrentSpaceId({ request: context.request, spaces: services.spaces });

            logger.info(`memory.beforeAgent: starting non-blocking search for "${query.slice(0, 60)}..."`);

            const retrievalPromise = runRetrieval(retrieval.method, memoryClient, query, logger, {
              stage: 'round_start',
              size: 20,
              esClient: services.elasticsearch.client.asInternalUser,
              space,
              config,
              inference: services.inference,
              request: context.request,
              connectorId: config.memory.extraction.connectorId,
            }).catch((err) => {
              logger.warn(`memory.beforeAgent: non-blocking search failed — ${(err as Error).message}`);
              return [] as MemoryNode[];
            });

            addUndeliveredRetrieval(retrievalPromise);
          },
        },
      },
    });
    logger.info('Memory before-agent hook registered (non-blocking — results via auto-retrieval)');
  }
};
