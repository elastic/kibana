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
import type { MemoryNode } from '@kbn/agent-builder-common';
import type { MemoryClient } from '../client';
import { createMemoryClient, memoryIndexName } from '../client';
import { DuplicateMerger } from './duplicate_merger';
import { ContradictionResolver } from './contradiction_resolver';
import { PruningService } from './pruning_service';

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
            const { elasticsearch, logger } = await getConsolidationDeps();

            if (abortController.signal.aborted) {
              logger.info('MemoryConsolidationTask: aborted before start');
              return { state: {} };
            }

            logger.info('MemoryConsolidationTask: starting nightly consolidation run');

            try {
              await runConsolidation({ elasticsearch, logger, abortSignal: abortController.signal });
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
  abortSignal,
}: {
  elasticsearch: ElasticsearchServiceStart;
  logger: Logger;
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
      await consolidateForUser({ esClient, space, userName, logger });
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
 */
const consolidateForUser = async ({
  esClient,
  space,
  userName,
  logger,
}: {
  esClient: ElasticsearchClient;
  space: string;
  userName: string;
  logger: Logger;
}): Promise<void> => {
  const memoryClient: MemoryClient = createMemoryClient({
    esClient,
    space,
    userName,
    logger,
  });

  // Load memories in batches
  const memories = await loadMemoriesBatch(memoryClient);

  if (memories.length === 0) {
    return;
  }

  logger.debug(
    `MemoryConsolidationTask: processing ${memories.length} memories for space='${space}' user='${userName}'`
  );

  // 1. Duplicate merging
  const merger = new DuplicateMerger({ esClient, memoryClient, logger });
  try {
    const mergeResult = await merger.mergeDuplicates(memories);
    logger.debug(
      `MemoryConsolidationTask: merged ${mergeResult.mergedCount} duplicates for user='${userName}'`
    );
  } catch (err) {
    logger.warn(
      `MemoryConsolidationTask: duplicate merger failed for user='${userName}' — ${(err as Error).message}`
    );
  }

  // Reload memories after merging (some may have been deprecated)
  const memoriesAfterMerge = await loadMemoriesBatch(memoryClient);

  // 2. Contradiction resolution
  const resolver = new ContradictionResolver({ memoryClient, logger });
  try {
    const resolveResult = await resolver.resolveContradictions(memoriesAfterMerge);
    logger.debug(
      `MemoryConsolidationTask: resolved ${resolveResult.resolved.length} contradictions for user='${userName}'`
    );
  } catch (err) {
    logger.warn(
      `MemoryConsolidationTask: contradiction resolver failed for user='${userName}' — ${(err as Error).message}`
    );
  }

  // Reload again after contradiction resolution
  const memoriesAfterResolution = await loadMemoriesBatch(memoryClient);

  // 3. Pruning (decay, hard-delete, stability, hub detection)
  const pruner = new PruningService({ memoryClient, logger });
  try {
    const pruningStats = await pruner.run(memoriesAfterResolution);
    logger.debug(
      `MemoryConsolidationTask: pruning complete for user='${userName}' — ` +
        `hardDeleted=${pruningStats.hardDeleted}, ` +
        `candidatesPruned=${pruningStats.candidatesPruned}, ` +
        `stabilityRecomputed=${pruningStats.stabilityRecomputed}, ` +
        `hubsMarked=${pruningStats.hubsMarked}`
    );
  } catch (err) {
    logger.warn(
      `MemoryConsolidationTask: pruning failed for user='${userName}' — ${(err as Error).message}`
    );
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
