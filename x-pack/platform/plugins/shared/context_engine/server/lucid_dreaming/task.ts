/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import type { WorkflowsClient } from '@kbn/workflows/server/types';
import { isLucidDreaming } from '../../common/dreaming';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import {
  LUCID_DREAMING_BATCH_READY_TRIGGER_ID,
  type LucidDreamingBatchReadyEvent,
} from '../../common/lucid_dreaming';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { findNewTraceRounds } from '../dreaming/trace_rounds';
import { managedWorkflowIdSuffixFor } from '../utils/managed_workflow_suffix';
import { planLucidBatches } from './plan';
import { readNewMemories } from './read_new_memories';

export const LUCID_DREAMING_TASK_TYPE = 'contextEngine:lucidDreaming';
const MINUTE_MS = 60 * 1000;
export const LUCID_MEMORY_BATCH_SIZE = 20;
export const LUCID_TRACE_BATCH_SIZE = 10;
/** How long a batch that is not full waits for more before it is dreamed on anyway. */
export const LUCID_MAX_WAIT_MS = 30 * 1000;
/** Longer than {@link LUCID_MAX_WAIT_MS}, so the rounds of one conversation land in one batch. */
export const LUCID_TRACE_MAX_WAIT_MS = 2 * MINUTE_MS;
/** Memories saved this recently are left for the next run: they may not be searchable yet. */
export const LUCID_MEMORY_SETTLE_MS = 30 * 1000;
/** Rounds that ended this recently are left for the next run: their conversation may go on. */
export const LUCID_TRACE_SETTLE_MS = MINUTE_MS;
/** Where a watcher with no cursor yet starts. */
export const LUCID_INITIAL_LOOKBACK_MS = 24 * 60 * MINUTE_MS;
const MAX_MEMORIES_PER_RUN = 200;
const MAX_ROUNDS_PER_RUN = 100;

const paramsSchema = schema.object({
  aiIndexId: schema.string({ maxLength: 512 }),
  spaceId: schema.string({ maxLength: 512 }),
});

const stateSchemaV1 = schema.object({
  memories_since: schema.maybe(schema.string()),
  memories_after_id: schema.maybe(schema.string()),
  traces_since: schema.maybe(schema.string()),
  traces_after: schema.maybe(schema.string()),
});

export type LucidDreamingTaskState = TypeOf<typeof stateSchemaV1>;

/** The id of the lucid dreaming watcher of an AI index. */
export const lucidDreamingTaskIdFor = (aiIndexId: string, spaceId: string): string =>
  `${LUCID_DREAMING_TASK_TYPE}:${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

export interface LucidDreamingWatchDeps {
  aiIndex: AiIndexItem;
  spaceId: string;
  state: LucidDreamingTaskState;
  /** Scoped to the user who turned lucid dreaming on. */
  esClient: ElasticsearchClient;
  emit: (event: LucidDreamingBatchReadyEvent) => Promise<void>;
  now: number;
  signal: AbortSignal;
  logger: Logger;
}

/**
 * Finds what an AI index saved and recorded since the cursors, reports each batch that is ready
 * to dream on, and returns the cursors moved past the batches reported.
 */
export const watchForLucidDreaming = async ({
  aiIndex,
  spaceId,
  state,
  esClient,
  emit,
  now,
  signal,
  logger,
}: LucidDreamingWatchDeps): Promise<LucidDreamingTaskState> => {
  const initial = new Date(now - LUCID_INITIAL_LOOKBACK_MS).toISOString();
  let next: LucidDreamingTaskState = {
    ...state,
    memories_since: state.memories_since ?? initial,
    traces_since: state.traces_since ?? initial,
  };
  const reported = async (event: LucidDreamingBatchReadyEvent): Promise<boolean> => {
    if (signal.aborted) {
      return false;
    }
    try {
      await emit(event);
      return true;
    } catch (error) {
      logger.warn(
        `Lucid dreaming could not report a batch of ${event.source} for AI index '${
          aiIndex.id
        }', and retries at its next run: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  };

  const memories = await readNewMemories({
    esClient,
    index: aiIndex.dest.value,
    spaceId,
    since: next.memories_since ?? initial,
    afterId: next.memories_after_id ?? '',
    until: new Date(now - LUCID_MEMORY_SETTLE_MS).toISOString(),
    size: MAX_MEMORIES_PER_RUN,
    signal,
  });
  const memoryPlan = planLucidBatches(memories, {
    batchSize: LUCID_MEMORY_BATCH_SIZE,
    maxWaitMs: LUCID_MAX_WAIT_MS,
    now,
    timeOf: ({ updatedAt }) => updatedAt,
  });
  for (const batch of memoryPlan.batches) {
    const ok = await reported({
      ai_index_id: aiIndex.id,
      source: 'memories',
      memory_ids: batch.map(({ id }) => id),
    });
    if (!ok) {
      return next;
    }
    const last = batch[batch.length - 1];
    next = { ...next, memories_since: last.updatedAt, memories_after_id: last.id };
  }

  if (aiIndex.traces.length === 0 || signal.aborted) {
    return next;
  }
  const settledAt = now - LUCID_TRACE_SETTLE_MS;
  const { rounds, sources } = await findNewTraceRounds({
    esClient,
    traces: aiIndex.traces,
    since: next.traces_since ?? initial,
    after: next.traces_after ?? '',
    until: new Date(settledAt).toISOString(),
    size: MAX_ROUNDS_PER_RUN,
  });
  for (const { type, value, error } of sources) {
    if (error) {
      logger.warn(`Lucid dreaming could not read trace source ${type} '${value}': ${error}`);
    }
  }
  const tracePlan = planLucidBatches(rounds, {
    batchSize: LUCID_TRACE_BATCH_SIZE,
    maxWaitMs: LUCID_TRACE_MAX_WAIT_MS,
    now: settledAt,
    timeOf: ({ lastAt }) => lastAt,
  });
  for (const batch of tracePlan.batches) {
    const ok = await reported({
      ai_index_id: aiIndex.id,
      source: 'traces',
      rounds: batch.map(({ traceId, lastAt }) => ({ trace_id: traceId, ended_at: lastAt })),
    });
    if (!ok) {
      return next;
    }
    const last = batch[batch.length - 1];
    next = { ...next, traces_since: last.lastAt, traces_after: last.traceId };
  }
  return next;
};

export interface RegisterLucidDreamingTaskDefinitionDeps {
  taskManager: TaskManagerSetupContract;
  getAiIndexService: () => AiIndexService;
  isDreamingAvailable: (spaceId: string) => Promise<boolean>;
  getScopedEsClient: (request: KibanaRequest) => Promise<ElasticsearchClient>;
  getWorkflowsClient: (request: KibanaRequest) => Promise<WorkflowsClient>;
  logger: Logger;
  getCurrentDate?: () => Date;
}

/** Registers the task type that watches one AI index for new memories and agent rounds. */
export const registerLucidDreamingTaskDefinition = ({
  taskManager,
  getAiIndexService,
  isDreamingAvailable,
  getScopedEsClient,
  getWorkflowsClient,
  logger,
  getCurrentDate = () => new Date(),
}: RegisterLucidDreamingTaskDefinitionDeps): void => {
  taskManager.registerTaskDefinitions({
    [LUCID_DREAMING_TASK_TYPE]: {
      title: 'Context Engine lucid dreaming watcher',
      description:
        'Watches one AI index for new memories and agent rounds, and reports small batches of them for lucid dreaming workflows to turn into facts and entities.',
      timeout: '2m',
      maxAttempts: 3,
      cost: TaskCost.Normal,
      paramsSchema,
      stateSchemaByVersion: {
        1: { schema: stateSchemaV1, up: (state) => state },
      },
      createTaskRunner: ({ taskInstance, fakeRequest, signal }) => ({
        async run() {
          const { aiIndexId, spaceId } = taskInstance.params as TypeOf<typeof paramsSchema>;
          const state = (taskInstance.state ?? {}) as LucidDreamingTaskState;
          if (!fakeRequest) {
            return throwUnrecoverableError(
              new Error(
                `Lucid dreaming for AI index '${aiIndexId}' has no user to run as. Save its dreaming config again.`
              )
            );
          }
          if (!(await isDreamingAvailable(spaceId))) {
            return { state };
          }

          let aiIndex: AiIndexItem;
          try {
            aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
          } catch (error) {
            if (error instanceof AiIndexNotFoundError) {
              return { state, shouldDeleteTask: true };
            }
            throw error;
          }
          if (!isLucidDreaming(aiIndex.dreaming)) {
            return { state, shouldDeleteTask: true };
          }

          const workflows = await getWorkflowsClient(fakeRequest);
          if (!workflows.isWorkflowsAvailable) {
            return { state };
          }
          const next = await watchForLucidDreaming({
            aiIndex,
            spaceId,
            state,
            esClient: await getScopedEsClient(fakeRequest),
            emit: (event) => workflows.emitEvent(LUCID_DREAMING_BATCH_READY_TRIGGER_ID, event),
            now: getCurrentDate().getTime(),
            signal,
            logger,
          });
          return { state: next };
        },
      }),
    },
  });
};

export interface LucidDreamingScheduler {
  /** Starts the watcher of an AI index, or moves it to the user of `request`. */
  schedule(params: {
    aiIndexId: string;
    spaceId: string;
    request: KibanaRequest;
    interval: string;
  }): Promise<void>;
  /** Stops the watcher of an AI index. */
  unschedule(params: { aiIndexId: string; spaceId: string }): Promise<void>;
}

export const createLucidDreamingScheduler = ({
  taskManager,
}: {
  taskManager: TaskManagerStartContract;
}): LucidDreamingScheduler => ({
  async schedule({ aiIndexId, spaceId, request, interval }) {
    await taskManager.ensureScheduled(
      {
        id: lucidDreamingTaskIdFor(aiIndexId, spaceId),
        taskType: LUCID_DREAMING_TASK_TYPE,
        schedule: { interval },
        params: { aiIndexId, spaceId },
        state: {},
      },
      { request, regenerateApiKey: true }
    );
  },
  async unschedule({ aiIndexId, spaceId }) {
    await taskManager.removeIfExists(lucidDreamingTaskIdFor(aiIndexId, spaceId));
  },
});
