/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskPriority } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import * as fs from 'fs';
import * as nodePath from 'path';
import type { MemoryNode, MemoryEdgeType } from '@kbn/agent-builder-common';
import { VALID_EDGE_TYPES } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';
import { createMemoryClient, memoryIndexName } from '../client';
import { DuplicateMerger } from './duplicate_merger';
import { ContradictionResolver } from './contradiction_resolver';
import { PruningService } from './pruning_service';
import type { AgentBuilderConfig } from '../../../config';

// ---------------------------------------------------------------------------
// Task constants
// ---------------------------------------------------------------------------

/** Task type identifier registered with Task Manager */
export const MEMORY_CONSOLIDATION_TASK_TYPE = 'agent_builder:memory_consolidation';

/** Singleton task ID — one run at a time across the cluster */
export const MEMORY_CONSOLIDATION_TASK_ID = `${MEMORY_CONSOLIDATION_TASK_TYPE}:default`;

/**
 * Default consolidation interval: run once every 24 hours.
 * Configurable via the schedule param when registering.
 */
const DEFAULT_CONSOLIDATION_INTERVAL = '24h';

/** Task timeout — 30 minutes */
const CONSOLIDATION_TIMEOUT = '30m';

/** Maximum memories processed per batch per user/space combination */
const BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Deps types
// ---------------------------------------------------------------------------

export interface ConsolidationDepsProvider {
  elasticsearch: ElasticsearchServiceStart;
  logger: Logger;
  config: AgentBuilderConfig;
  inference?: import('@kbn/inference-plugin/server').InferenceServerStart;
  conversations?: import('../../../services/conversation').ConversationService;
}

// ---------------------------------------------------------------------------
// Register task definition
// ---------------------------------------------------------------------------

/**
 * Register the nightly memory consolidation task type with Task Manager.
 * Must be called during plugin setup.
 *
 * The task runs nightly at 02:00 UTC (configurable via `schedule` param).
 * Concurrency is enforced by scheduling a single task instance with a fixed ID.
 */
export const registerMemoryConsolidationTaskDefinition = ({
  taskManager,
  getConsolidationDeps,
}: {
  taskManager: TaskManagerSetupContract;
  getConsolidationDeps: () => Promise<ConsolidationDepsProvider> | ConsolidationDepsProvider;
}): void => {
  taskManager.registerTaskDefinitions({
    [MEMORY_CONSOLIDATION_TASK_TYPE]: {
      title: 'Agent Builder: Memory Consolidation',
      timeout: CONSOLIDATION_TIMEOUT,
      maxAttempts: 1,
      priority: TaskPriority.Low,
      createTaskRunner: (context) => {
        const { abortController } = context;

        return {
          run: async () => {
            const deps = await getConsolidationDeps();
            const { elasticsearch, logger, config } = deps;

            if (abortController.signal.aborted) {
              logger.info('MemoryConsolidationTask: aborted before start');
              return { state: {} };
            }

            logger.info('MemoryConsolidationTask: starting nightly consolidation run');

            try {
              await runConsolidation({ elasticsearch, logger, config, inference: deps.inference, conversations: deps.conversations, abortSignal: abortController.signal });
              logger.info('MemoryConsolidationTask: consolidation run complete');
            } catch (err) {
              logger.error(
                `MemoryConsolidationTask: consolidation run failed — ${(err as Error).message}`
              );
            }

            return { state: {} };
          },
        };
      },
    },
  });
};

// ---------------------------------------------------------------------------
// Schedule task (called during start)
// ---------------------------------------------------------------------------

/**
 * Ensure the nightly memory consolidation task is scheduled.
 * Uses a fixed task ID so only one instance runs at a time.
 * Called once during plugin start.
 */
export const scheduleMemoryConsolidationTask = async ({
  taskManager,
  logger,
  interval = DEFAULT_CONSOLIDATION_INTERVAL,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  /** Task Manager interval string, e.g. '24h', '60m'. Defaults to '24h'. */
  interval?: string;
}): Promise<void> => {
  try {
    await taskManager.ensureScheduled({
      id: MEMORY_CONSOLIDATION_TASK_ID,
      taskType: MEMORY_CONSOLIDATION_TASK_TYPE,
      params: {},
      schedule: { interval },
      scope: ['agentBuilder'],
      state: {},
    });

    logger.info(
      `MemoryConsolidationTask: scheduled with interval '${interval}' (task id: ${MEMORY_CONSOLIDATION_TASK_ID})`
    );
  } catch (err) {
    logger.error(
      `MemoryConsolidationTask: failed to schedule — ${(err as Error).message}`
    );
  }
};

// ---------------------------------------------------------------------------
// Core consolidation logic
// ---------------------------------------------------------------------------

/**
 * Main consolidation routine executed by the task runner.
 *
 * Strategy:
 * 1. Discover all distinct (space, user_name) pairs in the memory index
 * 2. For each pair, load up to BATCH_SIZE memories
 * 3. Run duplicate merger, contradiction resolver, and pruning service
 *
 * Each step is independently error-handled so a failure in one pair
 * does not prevent processing of others.
 */
export interface ConsolidationStepStats {
  memories_created?: number;
  memories_deleted?: number;
  memories_merged?: number;
  memories_processed?: number;
  llm_calls?: number;
  contradictions_resolved?: number;
  links_created?: number;
}

export interface ConsolidationResult {
  pairs_processed: number;
  duration_ms: number;
  steps_run: string[];
  step_stats: Record<string, ConsolidationStepStats>;
}

export const runConsolidation = async ({
  elasticsearch,
  logger,
  config,
  inference,
  conversations,
  abortSignal,
  request,
  fullLog,
}: {
  elasticsearch: ElasticsearchServiceStart;
  logger: Logger;
  config: AgentBuilderConfig;
  inference?: import('@kbn/inference-plugin/server').InferenceServerStart;
  conversations?: import('../../../services/conversation').ConversationService;
  abortSignal: AbortSignal;
  request?: import('@kbn/core-http-server').KibanaRequest;
  fullLog?: boolean;
}): Promise<ConsolidationResult> => {
  const startTime = Date.now();
  const esClient = elasticsearch.client.asInternalUser;
  const stepsRun: string[] = [];

  // Step 1: Discover all (space, user_name) pairs
  let pairs: Array<{ space: string; userName: string }>;
  try {
    pairs = await discoverSpaceUserPairs(esClient, logger);
  } catch (err) {
    logger.error(
      `MemoryConsolidationTask: failed to discover space/user pairs — ${(err as Error).message}`
    );
    return { pairs_processed: 0, duration_ms: Date.now() - startTime, steps_run: stepsRun };
  }

  if (pairs.length === 0) {
    logger.info('MemoryConsolidationTask: no memory data to consolidate');
    return { pairs_processed: 0, duration_ms: Date.now() - startTime, steps_run: stepsRun };
  }

  logger.info(`MemoryConsolidationTask: consolidating ${pairs.length} space/user pairs`);

  const stepStats: Record<string, ConsolidationStepStats> = {};

  for (const { space, userName } of pairs) {
    if (abortSignal.aborted) {
      logger.info('MemoryConsolidationTask: aborted mid-run');
      break;
    }

    try {
      const pairStats = await consolidateForUser({ esClient, space, userName, logger, config, inference, conversations, request, fullLog });
      for (const [step, stats] of Object.entries(pairStats)) {
        const existing = stepStats[step] ?? {};
        stepStats[step] = {
          memories_created: (existing.memories_created ?? 0) + (stats.memories_created ?? 0),
          memories_deleted: (existing.memories_deleted ?? 0) + (stats.memories_deleted ?? 0),
          memories_merged: (existing.memories_merged ?? 0) + (stats.memories_merged ?? 0),
          memories_processed: (existing.memories_processed ?? 0) + (stats.memories_processed ?? 0),
          llm_calls: (existing.llm_calls ?? 0) + (stats.llm_calls ?? 0),
          contradictions_resolved: (existing.contradictions_resolved ?? 0) + (stats.contradictions_resolved ?? 0),
          links_created: (existing.links_created ?? 0) + (stats.links_created ?? 0),
        };
      }
    } catch (err) {
      logger.warn(
        `MemoryConsolidationTask: failed for space='${space}' user='${userName}' — ${
          (err as Error).message
        }`
      );
    }
  }

  const steps = config.memory.nightly.steps;
  if (steps.reextract.enabled) stepsRun.push('reextract');
  if (steps.deduplicate.enabled) stepsRun.push('deduplicate');
  if (steps.formMemories.enabled) stepsRun.push('formMemories');
  if (steps.formMemoriesNoLlm.enabled) stepsRun.push('formMemoriesNoLlm');
  if (steps.organize.enabled) stepsRun.push('organize');
  if (steps.prune.enabled) stepsRun.push('prune');
  if (steps.organizeNoLlm.enabled) stepsRun.push('organizeNoLlm');

  return { pairs_processed: pairs.length, duration_ms: Date.now() - startTime, steps_run: stepsRun, step_stats: stepStats };
};

/**
 * Consolidate memories for a single (space, user) pair.
 * Runs configured steps in order: reextract → deduplicate → formMemories → organize → prune → organizeNoLlm
 */
const consolidateForUser = async ({
  esClient,
  space,
  userName,
  logger,
  config,
  inference,
  conversations,
  request,
  fullLog,
}: {
  esClient: ElasticsearchClient;
  space: string;
  userName: string;
  logger: Logger;
  config: AgentBuilderConfig;
  inference?: import('@kbn/inference-plugin/server').InferenceServerStart;
  conversations?: import('../../../services/conversation').ConversationService;
  request?: import('@kbn/core-http-server').KibanaRequest;
  fullLog?: boolean;
}): Promise<Record<string, ConsolidationStepStats>> => {
  const stats: Record<string, ConsolidationStepStats> = {};
  const memoryClient: MemoryClient = createMemoryClient({
    esClient,
    space,
    userName,
    logger,
  });

  const steps = config.memory.nightly.steps;
  let memories = await loadMemoriesBatch(memoryClient);

  if (memories.length === 0) {
    return stats;
  }

  logger.info(
    `consolidation: processing ${memories.length} memories for space='${space}' user='${userName}'`
  );

  // Step 1: Reextract — remove candidate memories and reextract from full conversations
  if (steps.reextract.enabled) {
    try {
      const candidates = memories.filter((m) => m.status === 'candidate');
      const conversationIds = new Set(
        candidates.flatMap((m) => m.source_refs.map((r) => r.conversation_id)).filter(Boolean)
      );

      // Remove candidate memories
      let removed = 0;
      for (const candidate of candidates) {
        await memoryClient.delete(candidate.id);
        removed++;
      }

      logger.info(
        `consolidation[reextract]: removed ${removed} candidates from ${conversationIds.size} conversations`
      );

      // Reextract from full conversations if inference + conversations service available
      const connectorId = config.memory.extraction.connectorId;
      if (inference && conversations && connectorId && conversationIds.size > 0) {
        const { createExtractionStrategy } = await import('../extraction/extractor_factory');
        const { buildExtractionInputFromConversation } = await import('../extraction/memory_extractor');
        const { CandidatePipeline } = await import('../extraction/candidate_pipeline');
        const { createEmbeddingService } = await import('../embeddings');

        const convClient = await conversations.getScopedClient({ request: request ?? ({ headers: {} } as any) });

        let reextracted = 0;
        for (const convId of conversationIds) {
          try {
            const conversation = await convClient.get(convId);
            if (!conversation || conversation.rounds.length === 0) continue;

            const extractor = createExtractionStrategy({
              config,
              logger: logger.get('reextract'),
              inference,
              connectorId,
              request: request ?? ({ headers: {} } as any),
            });

            const input = buildExtractionInputFromConversation(conversation);
            const extraction = await extractor.extract(input);

            const totalCandidates = extraction.semantic.length + extraction.episodic.length + extraction.procedural.length;
            if (totalCandidates === 0) continue;

            const noopEmbedding = createEmbeddingService({
              esClient,
              config: { inferenceEndpointId: undefined },
              logger: logger.get('embedding'),
            });

            const pipeline = new CandidatePipeline({
              memoryClient,
              esClient,
              embeddingService: noopEmbedding,
              logger: logger.get('pipeline'),
            });

            const result = await pipeline.run(
              extraction,
              { conversationId: convId, roundId: 'reextract', space, userName },
              []
            );

            reextracted += result.created;
          } catch (err) {
            logger.warn(`consolidation[reextract]: failed for conversation ${convId} — ${(err as Error).message}`);
          }
        }

        logger.info(`consolidation[reextract]: reextracted ${reextracted} memories from ${conversationIds.size} conversations`);
      } else {
        logger.info('consolidation[reextract]: skipping reextraction (inference/conversations/connectorId not available)');
      }

      memories = await loadMemoriesBatch(memoryClient);
    } catch (err) {
      logger.warn(`consolidation[reextract]: failed — ${(err as Error).message}`);
    }
  }

  // Step 2: Deduplicate — find and merge similar memories
  if (steps.deduplicate.enabled) {
    try {
      const merger = new DuplicateMerger({ esClient, memoryClient, logger });
      const mergeResult = await merger.mergeDuplicates(memories);
      stats.deduplicate = { memories_merged: mergeResult.mergedCount };
      logger.info(`consolidation[deduplicate]: merged ${mergeResult.mergedCount} duplicates`);
      memories = await loadMemoriesBatch(memoryClient);
    } catch (err) {
      logger.warn(`consolidation[deduplicate]: failed — ${(err as Error).message}`);
    }
  }

  // Step 3: Form memories (LLM) — extract structured memories from new episodic content
  if (steps.formMemories.enabled) {
    try {
      const connectorId = config.memory.extraction.connectorId;
      if (!inference || !connectorId || !request) {
        logger.info('consolidation[formMemories]: skipping — inference, connectorId, or request not available');
      } else {
        // Load ALL episodic memories directly from ES (not limited by BATCH_SIZE)
        const allEpisodics = await loadAllMemoriesByType(esClient, space, userName, 'episodic', logger);

        // Find cutoff: most recent 'formed_from_episodic' semantic memory
        const formedMemories = memories.filter(
          (m) => m.type === 'semantic' && m.subtype === 'formed_from_episodic'
        );
        const lastFormedAt = formedMemories.length > 0
          ? formedMemories.reduce((latest, m) =>
              m.created_at > latest ? m.created_at : latest, '')
          : '';

        const newEpisodics = lastFormedAt
          ? allEpisodics.filter((m) => m.created_at > lastFormedAt)
          : allEpisodics;

        if (newEpisodics.length === 0) {
          logger.info('consolidation[formMemories]: no new episodic memories to process');
        } else {
          logger.info(`consolidation[formMemories]: found ${newEpisodics.length} episodic memories to process`);

          // Group by conversation ID, sort each group chronologically
          const byConversation = new Map<string, MemoryNode[]>();
          for (const mem of newEpisodics) {
            const convId = mem.source_refs?.[0]?.conversation_id ?? '_unknown';
            const group = byConversation.get(convId) ?? [];
            group.push(mem);
            byConversation.set(convId, group);
          }
          for (const group of byConversation.values()) {
            group.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
          }

          // Process in batches that fit the context window, making multiple LLM calls
          const maxTokens = steps.formMemories.maxContextTokens;
          let totalProcessed = 0;
          let totalCreated = 0;
          let llmCalls = 0;

          const { CognitiveExtractor } = await import('../extraction/cognitive_extractor');
          const { CandidatePipeline } = await import('../extraction/candidate_pipeline');
          const { createEmbeddingService } = await import('../embeddings');

          const noopEmbedding = createEmbeddingService({
            esClient,
            config: { inferenceEndpointId: undefined },
            logger: logger.get('embedding'),
          });

          // Build a flat list of (convId, memories) maintaining conversation grouping
          const conversationEntries = [...byConversation.entries()];
          let convIdx = 0;
          let memIdxInConv = 0;

          while (convIdx < conversationEntries.length) {
            let tokenCount = 0;
            const contentParts: string[] = [];
            let batchMemCount = 0;

            // Fill one batch
            while (convIdx < conversationEntries.length) {
              const [convId, group] = conversationEntries[convIdx];

              // If we haven't started this conversation yet, add the header
              if (memIdxInConv === 0) {
                const header = `\n--- Conversation: ${convId} ---`;
                const headerTokens = Math.ceil(header.length / 4);
                if (tokenCount + headerTokens > maxTokens && batchMemCount > 0) break;
                contentParts.push(header);
                tokenCount += headerTokens;
              }

              // Add memories from this conversation
              while (memIdxInConv < group.length) {
                const mem = group[memIdxInConv];
                const text = `[${mem.created_at}] ${mem.full || mem.summary}`;
                const tokens = Math.ceil(text.length / 4);
                if (tokenCount + tokens > maxTokens && batchMemCount > 0) break;
                contentParts.push(text);
                tokenCount += tokens;
                batchMemCount++;
                memIdxInConv++;
              }

              if (memIdxInConv >= group.length) {
                convIdx++;
                memIdxInConv = 0;
              } else {
                break;
              }
            }

            if (batchMemCount === 0) break;

            logger.info(
              `consolidation[formMemories]: batch ${llmCalls + 1} — ${batchMemCount} memories (~${tokenCount} tokens)`
            );

            let rawExchange: { system: string; userContent: string; rawResponse: string } | undefined;

            const extractor = new CognitiveExtractor({
              inference,
              connectorId,
              request: request ?? ({ headers: {} } as any),
              logger: logger.get('formMemories'),
              ...(fullLog ? {
                onRawExchange: (exchange) => { rawExchange = exchange; },
              } : {}),
            });

            const aggregatedText = contentParts.join('\n\n');

            const extraction = await extractor.extract({ message: aggregatedText });
            llmCalls++;
            totalProcessed += batchMemCount;

            if (fullLog) {
              const logDir = nodePath.join(process.cwd(), 'tmp', 'fulllog');
              if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
              const logFile = nodePath.join(logDir, `${new Date().toISOString().replace(/[:.]/g, '-')}_batch${llmCalls}.log`);
              const logContent =
                `=== BATCH ${llmCalls} ===\n` +
                `Memories in batch: ${batchMemCount}\n` +
                `Tokens (est): ~${Math.ceil(aggregatedText.length / 4)}\n\n` +
                `=== SYSTEM PROMPT ===\n${rawExchange?.system ?? '(not captured)'}\n\n` +
                `=== USER MESSAGE ===\n${rawExchange?.userContent ?? aggregatedText}\n\n` +
                `=== RAW LLM RESPONSE ===\n${rawExchange?.rawResponse ?? '(not captured)'}\n`;
              fs.writeFileSync(logFile, logContent);
              logger.info(`consolidation[formMemories]: full log written to ${logFile}`);
            }

            const totalCandidates =
              extraction.semantic.length + extraction.episodic.length + extraction.procedural.length;

            if (totalCandidates > 0) {
              const pipeline = new CandidatePipeline({
                memoryClient,
                esClient,
                embeddingService: noopEmbedding,
                logger: logger.get('pipeline'),
              });

              const result = await pipeline.run(
                extraction,
                { conversationId: 'consolidation-form', roundId: `formMemories-${llmCalls}`, space, userName },
                []
              );
              totalCreated += result.created;

              logger.info(
                `consolidation[formMemories]: batch ${llmCalls} created ${result.created} memories (semantic=${extraction.semantic.length}, episodic=${extraction.episodic.length}, procedural=${extraction.procedural.length})`
              );
            }
          }

          stats.formMemories = {
            memories_processed: totalProcessed,
            memories_created: totalCreated,
            llm_calls: llmCalls,
          };

          logger.info(
            `consolidation[formMemories]: total — ${totalCreated} memories created from ${totalProcessed} episodic in ${llmCalls} LLM calls`
          );
        }

        memories = await loadMemoriesBatch(memoryClient);
      }
    } catch (err) {
      logger.warn(`consolidation[formMemories]: failed — ${(err as Error).message}`);
    }
  }

  // Step 3b: Form memories (no-LLM) — cluster similar episodics into semantic memories
  if (steps.formMemoriesNoLlm.enabled) {
    try {
      const episodic = memories.filter((m) => m.type === 'episodic');
      const semantic = memories.filter((m) => m.type === 'semantic');

      const clusters = clusterBySimilarity(episodic, 0.6);

      let formed = 0;
      for (const cluster of clusters) {
        if (cluster.length < 2) continue;

        const clusterText = cluster.map((m) => m.summary).join(' ');
        const alreadyCovered = semantic.some((s) =>
          computeJaccard(s.summary, clusterText) > 0.5
        );
        if (alreadyCovered) continue;

        const combined = cluster.map((m) => m.summary).join('. ');
        await memoryClient.create({
          type: 'semantic',
          subtype: 'formed_from_episodic',
          summary: combined.length > 100 ? combined.slice(0, 97) + '...' : combined,
          full: cluster.map((m) => m.full).join('\n\n'),
          confidence: Math.max(...cluster.map((m) => m.confidence)),
          status: 'provisional',
          source_refs: cluster.flatMap((m) => m.source_refs),
          links: cluster.map((m) => ({
            target_id: m.id,
            type: 'derived_from' as MemoryEdgeType,
            weight: 0.7,
          })),
          space,
          user_name: userName,
        });
        formed++;
      }

      stats.formMemoriesNoLlm = { memories_created: formed, memories_processed: episodic.length };
      logger.info(`consolidation[formMemoriesNoLlm]: formed ${formed} semantic memories from ${episodic.length} episodic`);
      memories = await loadMemoriesBatch(memoryClient);
    } catch (err) {
      logger.warn(`consolidation[formMemoriesNoLlm]: failed — ${(err as Error).message}`);
    }
  }

  // Step 4: Organize (LLM-based) — contradiction resolution + graph maintenance
  if (steps.organize.enabled) {
    try {
      const resolver = new ContradictionResolver({ memoryClient, logger });
      const resolveResult = await resolver.resolveContradictions(memories);
      stats.organize = { contradictions_resolved: resolveResult.resolved.length };
      logger.info(`consolidation[organize]: resolved ${resolveResult.resolved.length} contradictions`);
      memories = await loadMemoriesBatch(memoryClient);
    } catch (err) {
      logger.warn(`consolidation[organize]: failed — ${(err as Error).message}`);
    }
  }

  // Step 5: Prune — remove old/unused memories, enforce max count
  if (steps.prune.enabled) {
    try {
      const now = Date.now();
      const maxAgeMs = steps.prune.maxAgeDays * 24 * 60 * 60 * 1000;

      // Time-based pruning: remove deprecated memories older than maxAgeDays
      let pruned = 0;
      for (const memory of memories) {
        if (memory.status === 'deprecated') {
          const createdAt = new Date(memory.created_at).getTime();
          if (now - createdAt > maxAgeMs) {
            await memoryClient.delete(memory.id);
            pruned++;
          }
        }
      }

      // Prune candidates with no reinforcement older than 3 days
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      for (const memory of memories) {
        if (memory.status === 'candidate' && (memory.reinforcement_score ?? 0) === 0) {
          const createdAt = new Date(memory.created_at).getTime();
          if (now - createdAt > threeDaysMs) {
            await memoryClient.delete(memory.id);
            pruned++;
          }
        }
      }

      // Count-based pruning: if over maxMemories, remove least-accessed
      memories = await loadMemoriesBatch(memoryClient);
      if (memories.length > steps.prune.maxMemories) {
        const sorted = [...memories].sort((a, b) => {
          const scoreA = (a.access_count ?? 0) + (a.reinforcement_score ?? 0) * 10;
          const scoreB = (b.access_count ?? 0) + (b.reinforcement_score ?? 0) * 10;
          return scoreA - scoreB;
        });
        const toRemove = sorted.slice(0, memories.length - steps.prune.maxMemories);
        for (const memory of toRemove) {
          await memoryClient.delete(memory.id);
          pruned++;
        }
      }

      stats.prune = { memories_deleted: pruned };
      logger.info(`consolidation[prune]: pruned ${pruned} memories (maxAge=${steps.prune.maxAgeDays}d, maxCount=${steps.prune.maxMemories})`);
      memories = await loadMemoriesBatch(memoryClient);
    } catch (err) {
      logger.warn(`consolidation[prune]: failed — ${(err as Error).message}`);
    }
  }

  // Step 6: Organize without LLM — auto-link using params/subtypes
  if (steps.organizeNoLlm.enabled) {
    try {
      let linked = 0;

      // Link memories with matching subtypes that don't already have links
      const bySubtype = new Map<string, MemoryNode[]>();
      for (const m of memories) {
        if (!m.subtype) continue;
        const key = `${m.type}:${m.subtype}`;
        const group = bySubtype.get(key) ?? [];
        group.push(m);
        bySubtype.set(key, group);
      }

      for (const [, group] of bySubtype) {
        if (group.length < 2) continue;

        // Link first to second, second to third, etc. (chain)
        for (let i = 0; i < group.length - 1; i++) {
          const from = group[i];
          const to = group[i + 1];

          const alreadyLinked = from.links.some((l) => l.target_id === to.id);
          if (!alreadyLinked) {
            await memoryClient.addLink(from.id, {
              target_id: to.id,
              type: 'related_to',
              weight: 0.5,
            });
            linked++;
          }
        }
      }

      // Link memories sharing the same conversation_id via same_project edges
      const byConversation = new Map<string, MemoryNode[]>();
      for (const m of memories) {
        for (const ref of m.source_refs) {
          if (!ref.conversation_id) continue;
          const group = byConversation.get(ref.conversation_id) ?? [];
          group.push(m);
          byConversation.set(ref.conversation_id, group);
        }
      }

      for (const [, group] of byConversation) {
        if (group.length < 2) continue;
        // Link first and last in the group (bookend link)
        const from = group[0];
        const to = group[group.length - 1];
        if (from.id !== to.id) {
          const alreadyLinked = from.links.some((l) => l.target_id === to.id);
          if (!alreadyLinked) {
            await memoryClient.addLink(from.id, {
              target_id: to.id,
              type: 'same_project',
              weight: 0.4,
            });
            linked++;
          }
        }
      }

      stats.organizeNoLlm = { links_created: linked };
      logger.info(`consolidation[organizeNoLlm]: created ${linked} links from subtypes and conversations`);
    } catch (err) {
      logger.warn(`consolidation[organizeNoLlm]: failed — ${(err as Error).message}`);
    }
  }

  return stats;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Load up to BATCH_SIZE memories for a (space, user) pair across all statuses.
 */
const loadMemoriesBatch = async (memoryClient: MemoryClient): Promise<MemoryNode[]> => {
  return memoryClient.list({ size: BATCH_SIZE });
};

/**
 * Load all memories of a given type for a (space, user) pair using scroll-like pagination.
 * Not limited by BATCH_SIZE — loads everything.
 */
const loadAllMemoriesByType = async (
  esClient: ElasticsearchClient,
  space: string,
  userName: string,
  type: string,
  logger: Logger
): Promise<MemoryNode[]> => {
  const allNodes: MemoryNode[] = [];
  const pageSize = 500;
  let searchAfter: any[] | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await esClient.search({
      index: memoryIndexName,
      size: pageSize,
      query: {
        bool: {
          filter: [
            { term: { space } },
            { term: { user_name: userName } },
            { term: { type } },
          ],
        },
      },
      sort: [{ created_at: { order: 'asc' } }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });

    const hits = response.hits.hits;
    if (hits.length === 0) break;

    for (const hit of hits) {
      const src = (hit as any)._source;
      if (!src) continue;
      allNodes.push({
        id: hit._id as string,
        type: src.type ?? 'episodic',
        subtype: src.subtype,
        summary: src.summary ?? '',
        full: src.full ?? '',
        confidence: src.confidence ?? 0.5,
        salience: src.salience ?? 0.5,
        recency: src.recency ?? '',
        utility: src.utility ?? 0.5,
        stability: src.stability ?? 0.1,
        access_count: src.access_count ?? 0,
        reinforcement_score: src.reinforcement_score ?? 0,
        status: src.status ?? 'candidate',
        source_refs: src.source_refs ?? [],
        links: src.links ?? [],
        created_at: src.created_at ?? '',
        updated_at: src.updated_at ?? '',
        space: src.space ?? '',
        user_id: src.user_id,
        user_name: src.user_name ?? '',
      });
    }

    searchAfter = (hits[hits.length - 1] as any).sort;
    if (hits.length < pageSize) break;
  }

  logger.debug(`loadAllMemoriesByType: loaded ${allNodes.length} ${type} memories for space=${space} user=${userName}`);
  return allNodes;
};

/**
 * Cluster memories by Jaccard word-overlap similarity.
 */
const clusterBySimilarity = (memories: MemoryNode[], threshold: number): MemoryNode[][] => {
  const clusters: MemoryNode[][] = [];
  const assigned = new Set<string>();

  for (const memory of memories) {
    if (assigned.has(memory.id)) continue;

    const cluster: MemoryNode[] = [memory];
    assigned.add(memory.id);

    for (const other of memories) {
      if (assigned.has(other.id)) continue;
      if (computeJaccard(memory.summary, other.summary) >= threshold) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
};

const computeJaccard = (a: string, b: string): number => {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.size / union.size : 0;
};

/**
 * Discover all distinct (space, user_name) pairs present in the memory index.
 * Uses an aggregation to avoid scanning all documents.
 */
const discoverSpaceUserPairs = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<Array<{ space: string; userName: string }>> => {
  try {
    const response = await esClient.search({
      index: memoryIndexName,
      size: 0,
      aggs: {
        spaces: {
          terms: {
            field: 'space',
            size: 100,
          },
          aggs: {
            users: {
              terms: {
                field: 'user_name',
                size: 100,
              },
            },
          },
        },
      },
    });

    const pairs: Array<{ space: string; userName: string }> = [];

    const spaceBuckets = (
      response.aggregations?.spaces as
        | {
            buckets: Array<{
              key: string;
              users: { buckets: Array<{ key: string }> };
            }>;
          }
        | undefined
    )?.buckets ?? [];

    for (const spaceBucket of spaceBuckets) {
      const space = spaceBucket.key;
      const userBuckets = spaceBucket.users?.buckets ?? [];
      for (const userBucket of userBuckets) {
        pairs.push({ space, userName: userBucket.key });
      }
    }

    return pairs;
  } catch (err) {
    // Index may not exist yet
    if ((err as Error).message?.includes('index_not_found')) {
      logger.debug('MemoryConsolidationTask: memory index does not exist yet — skipping');
      return [];
    }
    throw err;
  }
};
