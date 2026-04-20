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
import type { KibanaRequest } from '@kbn/core-http-server';
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

export interface InjectedMemory {
  id: string;
  type: string;
  summary: string;
  created_at: string;
  score?: number;
  relevance_score?: number;
}

/**
 * Global store for injected memories, keyed by a correlation ID.
 * The route handler allocates an ID, registers it, and the hooks/tools
 * write to the currently active correlation ID.
 */
let activeCorrelationId: string | undefined;
let nextCorrelationId = 0;

const injectedMemoriesStore = new Map<string, InjectedMemory[]>();
const retrievalDurationStore = new Map<string, number>();

const cleanupAfterMs = 5 * 60 * 1000;
const scheduleCleanup = (key: string) => {
  setTimeout(() => {
    injectedMemoriesStore.delete(key);
    retrievalDurationStore.delete(key);
  }, cleanupAfterMs).unref();
};

/**
 * Start a new memory tracking session. Returns a correlation ID.
 * All subsequent appendInjectedMemories calls will write to this ID
 * until a new session starts.
 */
export const startMemoryTracking = (): string => {
  const id = String(++nextCorrelationId);
  activeCorrelationId = id;
  return id;
};

/**
 * Retrieve the list of memories by correlation key.
 */
export const getInjectedMemoriesByKey = (key: string): InjectedMemory[] => {
  return injectedMemoriesStore.get(key) ?? [];
};

/**
 * Retrieve the list of memories that were injected into the agent prompt
 * for the given request (across all injection sources: round-start, auto-retrieval, remember tool).
 */
export const getInjectedMemories = (request: KibanaRequest): InjectedMemory[] => {
  return injectedMemoriesStore.get(request.id) ?? [];
};

/**
 * Append memories to the injected memories list.
 * Uses the active correlation ID set by startMemoryTracking().
 * Falls back to request.id if no active session.
 */
export const appendInjectedMemories = (request: KibanaRequest, memories: InjectedMemory[]): void => {
  const key = activeCorrelationId ?? request.id;
  const existing = injectedMemoriesStore.get(key) ?? [];
  const seen = new Set(existing.map((m) => m.id));
  const deduped = memories.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  injectedMemoriesStore.set(key, [...existing, ...deduped]);
  scheduleCleanup(key);
};

/**
 * Retrieve the duration (ms) of the blocking pre-round memory retrieval
 * by correlation key.
 */
export const getRetrievalDurationMsByKey = (key: string): number => {
  return retrievalDurationStore.get(key) ?? 0;
};

/**
 * Retrieve the duration (ms) of the blocking pre-round memory retrieval.
 */
export const getRetrievalDurationMs = (request: KibanaRequest): number => {
  return retrievalDurationStore.get(request.id) ?? 0;
};

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
  'These are your personal memories from past interactions. Treat them as things you genuinely remember — ' +
  'not as records or data you looked up. Speak naturally: "I remember you mentioned..." not "I found a record that...". ' +
  'If nothing relevant comes to mind, that is perfectly fine — simply say you don\'t remember.\n\n' +
  'You can explore your memories further:\n' +
  '- Recall full details (only useful when +N chars is shown): remember(memory_id, full=true)\n' +
  '- Search your memories by keyword: remember(query="keyword")\n' +
  '- Browse memories around a specific one: remember(query="keyword", around_id="memory_id", hops=10)\n' +
  '- Browse nearby memories: remember(around_id="memory_id", hops=10)';

export const formatMemoryInjection = (nodes: ScoredMemoryNode[]): string => {
  if (nodes.length === 0) {
    return '';
  }

  const lines: string[] = ['## Retrieved Memories'];
  for (const { node } of nodes) {
    const timestamp = node.created_at
      ? new Date(node.created_at).toISOString().slice(0, 16).replace('T', ' ')
      : '';
    const extraChars = (node.full?.length ?? 0) - (node.summary?.length ?? 0);
    const fullIndicator = extraChars > 10 ? ` [+${extraChars} chars]` : '';
    lines.push(`[${node.id}] (${node.type}) ${timestamp} — ${node.summary}${fullIndicator}`);
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
const MEMORY_CONTEXT_END = '[/Memory Context]';

export const injectMemoryIntoMessage = (message: string, memoryBundle: string): string => {
  if (!memoryBundle) {
    return message;
  }
  return `[Memory Context]\n${memoryBundle}\n${MEMORY_CONTEXT_END}\n\n${message}`;
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
  logger: Logger,
  opts: { minRelevanceScore?: number } = {}
): ScoredMemoryNode[] => {
  const stage = 'round_start';
  const tokenBudget = getTokenBudgetForStage(stage);
  const now = Date.now();
  const minScore = opts.minRelevanceScore ?? 0;

  const selectedSummaries: string[] = [];
  const result: ScoredMemoryNode[] = [];
  let usedTokens = 0;

  const scored = nodes.map((node) => {
    const relevance = node._relevance_score ?? 0.5;
    return scoreMemoryNode({
      node,
      relevanceScore: relevance,
      stage,
      now,
      selectedSummaries: [],
      config: DEFAULT_RETRIEVAL_CONFIG,
    });
  });

  // Sort by composite score descending
  scored.sort((a, b) => b.score - a.score);

  let rejected = 0;
  for (const scoredNode of scored) {
    if (minScore > 0 && scoredNode.score < minScore) {
      rejected++;
      continue;
    }
    const tokens = ActiveMemorySet.estimateTokens(scoredNode.node.summary);
    if (usedTokens + tokens > tokenBudget) {
      continue;
    }
    result.push(scoredNode);
    selectedSummaries.push(scoredNode.node.summary);
    usedTokens += tokens;
  }

  logger.debug(
    `memory.beforeAgent: ${result.length}/${nodes.length} memories fit token budget=${tokenBudget}, used=${usedTokens} tokens` +
    (rejected > 0 ? `, rejected ${rejected} below minRelevanceScore=${minScore}` : '')
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

  // Score and apply token budget + minimum relevance threshold
  const minRelevanceScore = deps.config.memory.retrieval.postRetrieval.minRelevanceScore ?? 0;
  const scoredNodes = scoreAndBudgetNodes(retrievedNodes, 1.0, logger, { minRelevanceScore });

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

  // Store injected memories and retrieval duration for the response
  const corrKey = activeCorrelationId ?? context.request.id;
  injectedMemoriesStore.set(
    corrKey,
    scoredNodes.map(({ node, score, relevanceScore }) => ({
      id: node.id,
      type: node.type,
      summary: node.summary,
      created_at: node.created_at,
      score: Math.round(score * 1000) / 1000,
      relevance_score: Math.round(relevanceScore * 1000) / 1000,
    }))
  );
  retrievalDurationStore.set(corrKey, totalDuration);
  scheduleCleanup(corrKey);

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
