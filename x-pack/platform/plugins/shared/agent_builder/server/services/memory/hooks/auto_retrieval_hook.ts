/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type { BeforeToolCallHookContext, AfterToolCallHookContext } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { memoryTools } from '@kbn/agent-builder-common';
import type { AgentBuilderConfig } from '../../../config';
import type { InternalSetupServices, InternalStartServices } from '../../types';
import { runRetrieval } from '../retrieval/run_retrieval';
import { formatMemoryInjection } from './before_agent_hook';
import type { MemoryNode } from '@kbn/agent-builder-common';

interface AutoRetrievalDeps {
  logger: Logger;
  config: AgentBuilderConfig;
  getInternalServices: () => InternalStartServices;
}

const memoryToolIds = new Set(Object.values(memoryTools));

// Per-toolCallId pending retrieval promises
const pendingRetrievals = new Map<string, Promise<MemoryNode[]>>();

// Undelivered memories that didn't finish in time for tool results.
// Consumed by getPendingMemories() for injection into the answer agent.
let undeliveredMemories: Promise<MemoryNode[]>[] = [];

/**
 * Add a retrieval promise to the undelivered queue.
 * Used by the non-blocking beforeAgent hook to queue round-start
 * retrieval for delivery on the next tool call or at handover.
 */
export const addUndeliveredRetrieval = (promise: Promise<MemoryNode[]>): void => {
  undeliveredMemories.push(promise);
};

/**
 * Get and clear any undelivered memories from auto-retrieval.
 * Called by the prepareToAnswer step to inject into the answer agent context.
 */
export const consumeUndeliveredMemories = async (): Promise<MemoryNode[]> => {
  if (undeliveredMemories.length === 0) return [];

  const promises = [...undeliveredMemories];
  undeliveredMemories = [];

  const results = await Promise.allSettled(promises);
  const memories: MemoryNode[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      memories.push(...result.value);
    }
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  return memories.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
};

/**
 * Register hooks that automatically trigger memory retrieval on every
 * non-memory tool call using the _reasoning parameter as the search query.
 *
 * - beforeToolCall: starts retrieval concurrently (non-blocking)
 * - afterToolCall: if retrieval finished, augments tool return with memories
 */
export const registerMemoryAutoRetrievalHook = (
  serviceSetups: InternalSetupServices,
  deps: AutoRetrievalDeps
): void => {
  const logger = deps.logger.get('memory.autoRetrieval');

  serviceSetups.hooks.register({
    id: 'memory-auto-retrieval',
    hooks: {
      [HookLifecycle.beforeToolCall]: {
        mode: HookExecutionMode.nonBlocking,
        handler: async (context: BeforeToolCallHookContext) => {
          if (memoryToolIds.has(context.toolId)) {
            logger.info(`auto-retrieval: skipping memory tool ${context.toolId}`);
            return;
          }

          const reasoning = (context.toolParams as Record<string, unknown>)?._reasoning;
          if (typeof reasoning !== 'string' || !reasoning.trim()) {
            logger.info(`auto-retrieval: no _reasoning provided for tool=${context.toolId}, skipping`);
            return;
          }

          logger.info(
            `auto-retrieval: starting memory search for tool=${context.toolId}, ` +
            `query="${reasoning.slice(0, 80)}...", method=${deps.config.memory.retrieval.method}`
          );

          let services: InternalStartServices;
          try {
            services = deps.getInternalServices();
          } catch (err) {
            logger.info(`auto-retrieval: services not available — ${(err as Error).message}`);
            return;
          }

          const memoryClient = await services.memory.getScopedClient({
            request: context.request,
          });

          const startTime = Date.now();
          const retrievalPromise = runRetrieval(
            deps.config.memory.retrieval.method,
            memoryClient,
            reasoning,
            logger,
            {
              stage: 'tool_checkpoint',
              size: 5,
              esClient: services.elasticsearch.client.asInternalUser,
              config: deps.config,
              inference: services.inference,
              request: context.request,
              connectorId: deps.config.memory.extraction.connectorId,
            }
          ).then((results) => {
            logger.info(
              `auto-retrieval: search completed in ${Date.now() - startTime}ms, ` +
              `found ${results.length} memories for tool=${context.toolId}`
            );
            return results;
          }).catch((err: Error) => {
            logger.warn(`auto-retrieval: search failed for tool=${context.toolId}: ${err.message}`);
            return [] as MemoryNode[];
          });

          pendingRetrievals.set(context.toolCallId, retrievalPromise);
        },
      },
      [HookLifecycle.afterToolCall]: {
        mode: HookExecutionMode.blocking,
        handler: async (context: AfterToolCallHookContext) => {
          const retrieval = pendingRetrievals.get(context.toolCallId);
          pendingRetrievals.delete(context.toolCallId);

          logger.info(
            `auto-retrieval: afterToolCall for tool=${context.toolId}, ` +
            `hasCurrentRetrieval=${!!retrieval}, pendingUndelivered=${undeliveredMemories.length}`
          );

          // Collect all resolved memories: current retrieval + any previously undelivered
          const allMemories: MemoryNode[] = [];

          // Check previously undelivered retrievals
          if (undeliveredMemories.length > 0) {
            const stillPending: Promise<MemoryNode[]>[] = [];
            for (const pending of undeliveredMemories) {
              const settled = await Promise.race([
                pending.then((r) => ({ done: true as const, result: r })),
                Promise.resolve({ done: false as const, result: [] as MemoryNode[] }),
              ]);
              if (settled.done && settled.result.length > 0) {
                allMemories.push(...settled.result);
              } else if (!settled.done) {
                stillPending.push(pending);
              }
            }
            undeliveredMemories = stillPending;
          }

          // Check current retrieval
          if (retrieval) {
            const settled = await Promise.race([
              retrieval.then((r) => ({ done: true as const, result: r })),
              Promise.resolve({ done: false as const, result: [] as MemoryNode[] }),
            ]);

            if (settled.done && settled.result.length > 0) {
              allMemories.push(...settled.result);
            } else if (!settled.done) {
              undeliveredMemories.push(retrieval);
            }
          }

          if (allMemories.length === 0) {
            logger.info(`auto-retrieval: no memories ready for tool=${context.toolId}`);
            return;
          }

          // Deduplicate by ID
          const seen = new Set<string>();
          const dedupedMemories = allMemories.filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });

          const memoriesText = formatMemoryInjection(
            dedupedMemories.map((m) => ({ node: m, score: m.confidence }))
          );

          if (!memoriesText) return;

          logger.info(
            `auto-retrieval: returning ${dedupedMemories.length} memories with tool=${context.toolId} result`
          );

          // Augment the tool return by appending memories to the results
          if (context.toolReturn?.results) {
            for (const result of context.toolReturn.results) {
              if (typeof result.data === 'string') {
                result.data = `${result.data}\n\n[Retrieved Memories]\n${memoriesText}`;
              } else if (result.data && typeof result.data === 'object') {
                (result.data as Record<string, unknown>)._memories = memoriesText;
              }
            }
          }

          return { toolReturn: context.toolReturn };
        },
      },
    },
  });

  logger.info('Memory auto-retrieval hook registered');
};
