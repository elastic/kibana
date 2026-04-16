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
            const { elasticsearch, logger, config } = await getConsolidationDeps();

            if (abortController.signal.aborted) {
              logger.info('MemoryConsolidationTask: aborted before start');
              return { state: {} };
            }

            logger.info('MemoryConsolidationTask: starting nightly consolidation run');

            try {
              await runConsolidation({ elasticsearch, logger, config, abortSignal: abortController.signal });
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
const runConsolidation = async ({
  elasticsearch,
  logger,
  config,
  abortSignal,
}: {
  elasticsearch: ElasticsearchServiceStart;
  logger: Logger;
  config: AgentBuilderConfig;
  abortSignal: AbortSignal;
}): Promise<void> => {
  const esClient = elasticsearch.client.asInternalUser;

  // Step 1: Discover all (space, user_name) pairs
  let pairs: Array<{ space: string; userName: string }>;
  try {
    pairs = await discoverSpaceUserPairs(esClient, logger);
  } catch (err) {
    logger.error(
      `MemoryConsolidationTask: failed to discover space/user pairs — ${(err as Error).message}`
    );
    return;
  }

  if (pairs.length === 0) {
    logger.info('MemoryConsolidationTask: no memory data to consolidate');
    return;
  }

  logger.info(`MemoryConsolidationTask: consolidating ${pairs.length} space/user pairs`);

  for (const { space, userName } of pairs) {
    if (abortSignal.aborted) {
      logger.info('MemoryConsolidationTask: aborted mid-run');
      break;
    }

    try {
      await consolidateForUser({ esClient, space, userName, logger, config });
    } catch (err) {
      logger.warn(
        `MemoryConsolidationTask: failed for space='${space}' user='${userName}' — ${
          (err as Error).message
        }`
      );
    }
  }
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
}: {
  esClient: ElasticsearchClient;
  space: string;
  userName: string;
  logger: Logger;
  config: AgentBuilderConfig;
}): Promise<void> => {
  const memoryClient: MemoryClient = createMemoryClient({
    esClient,
    space,
    userName,
    logger,
  });

  const steps = config.memory.nightly.steps;
  let memories = await loadMemoriesBatch(memoryClient);

  if (memories.length === 0) {
    return;
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
      // Note: actual reextraction of full conversations would require the conversation service
      // and inference, which are not available in the task context. This step just cleans up
      // candidates so the next idle/after-round extraction re-creates them.

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
      logger.info(`consolidation[deduplicate]: merged ${mergeResult.mergedCount} duplicates`);
      memories = await loadMemoriesBatch(memoryClient);
    } catch (err) {
      logger.warn(`consolidation[deduplicate]: failed — ${(err as Error).message}`);
    }
  }

  // Step 3: Form memories — promote episodic patterns into semantic memories
  if (steps.formMemories.enabled) {
    try {
      const episodic = memories.filter((m) => m.type === 'episodic');
      const semantic = memories.filter((m) => m.type === 'semantic');

      // Group episodic memories by similar summaries (naive word overlap)
      const clusters = clusterBySimilarity(episodic, 0.6);

      let formed = 0;
      for (const cluster of clusters) {
        if (cluster.length < 2) continue;

        // Check if a semantic memory already covers this cluster
        const clusterText = cluster.map((m) => m.summary).join(' ');
        const alreadyCovered = semantic.some((s) =>
          computeJaccard(s.summary, clusterText) > 0.5
        );
        if (alreadyCovered) continue;

        // Create a new semantic memory from the cluster
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

      logger.info(`consolidation[formMemories]: formed ${formed} semantic memories from ${episodic.length} episodic`);
      memories = await loadMemoriesBatch(memoryClient);
    } catch (err) {
      logger.warn(`consolidation[formMemories]: failed — ${(err as Error).message}`);
    }
  }

  // Step 4: Organize (LLM-based) — contradiction resolution + graph maintenance
  if (steps.organize.enabled) {
    try {
      const resolver = new ContradictionResolver({ memoryClient, logger });
      const resolveResult = await resolver.resolveContradictions(memories);
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

      logger.info(`consolidation[organizeNoLlm]: created ${linked} links from subtypes and conversations`);
    } catch (err) {
      logger.warn(`consolidation[organizeNoLlm]: failed — ${(err as Error).message}`);
    }
  }
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
