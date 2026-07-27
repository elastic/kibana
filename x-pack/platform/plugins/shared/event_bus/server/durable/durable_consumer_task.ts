/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  TaskCost,
  TaskPriority,
  type RunContext,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { BROADCAST_TARGET } from '../types';
import type { EsNames } from '../es/names';
import type { SubscriptionRegistry } from '../subscription_registry';
import { readBatch } from '../tail/tail_reader';
import { cursorFromEvent, fromStored, toStored, type StoredCursor } from '../tail/cursor';

export const DURABLE_CONSUMER_TASK_TYPE = 'event_bus:durable_consumer';

export const durableConsumerTaskId = (consumer: string): string =>
  `${DURABLE_CONSUMER_TASK_TYPE}:${consumer}`;

const paramsSchema = schema.object({
  consumer: schema.string(),
  types: schema.arrayOf(schema.string(), { minSize: 1 }),
  startTs: schema.number(),
});

const storedCursorSchema = schema.nullable(
  schema.object({ ts: schema.number(), id: schema.string() })
);

const stateSchemaV1 = schema.object({
  cursor: storedCursorSchema,
});

interface DurableConsumerParams {
  consumer: string;
  types: string[];
  startTs: number;
}

interface DurableConsumerState {
  cursor: StoredCursor | null;
}

export interface RegisterDurableConsumerTaskDeps {
  taskManager: TaskManagerSetupContract;
  getEsClient: () => Promise<ElasticsearchClient>;
  registry: SubscriptionRegistry;
  names: EsNames;
  logger: Logger;
  safetyLagMs: number;
  batchSize: number;
}

/**
 * Registers the durable consumer task type. Each run drains exactly one bounded
 * batch and returns `{ state: { cursor } }` — it never runs an infinite loop,
 * because Task Manager discards state when a run times out. A recurring task is
 * a single-runner (claimed by one node at a time) which is the correct model
 * for a logical, at-least-once consumer.
 */
export const registerDurableConsumerTask = (deps: RegisterDurableConsumerTaskDeps): void => {
  const { taskManager, getEsClient, registry, names, logger, safetyLagMs, batchSize } = deps;

  taskManager.registerTaskDefinitions({
    [DURABLE_CONSUMER_TASK_TYPE]: {
      title: 'Event bus durable consumer',
      description:
        'Tails the event bus datastream for one durable logical consumer, persisting its cursor in task state (at-least-once).',
      timeout: '1m',
      // We never throw on failure (we self-heal on the next recurring run), so
      // retries are unnecessary.
      maxAttempts: 1,
      cost: TaskCost.Normal,
      priority: TaskPriority.Normal,
      paramsSchema,
      stateSchemaByVersion: {
        1: { schema: stateSchemaV1, up: (state) => state },
      },
      createTaskRunner: ({ taskInstance, signal }: RunContext) => ({
        run: async () => {
          const { consumer, types, startTs } = taskInstance.params as DurableConsumerParams;
          const previousState = (taskInstance.state ?? {}) as Partial<DurableConsumerState>;
          let cursor = fromStored(previousState.cursor);

          const returnState = (): { state: Record<string, unknown> } => ({
            state: { cursor: toStored(cursor) },
          });

          const subscription = registry.getDurable(consumer);
          if (!subscription) {
            // No handler registered on this node yet (e.g. dependent plugin not
            // started). Skip without advancing; retry next interval.
            logger.warn(
              `event bus durable consumer "${consumer}" has no handler on this node; skipping run`
            );
            return returnState();
          }

          const esClient = await getEsClient();
          const filter: estypes.QueryDslQueryContainer[] = [
            { terms: { target: [BROADCAST_TARGET] } },
            { terms: { 'event.type': types } },
          ];

          let batch;
          try {
            batch = await readBatch({
              esClient,
              index: names.dataStream,
              filter,
              cursor,
              startTs,
              safetyLagMs,
              batchSize,
              signal,
            });
          } catch (err) {
            // Transient read failure: keep the cursor and retry next run. We do
            // not throw, because a thrown (or timed-out) run discards state.
            logger.error(`event bus durable consumer "${consumer}" read failed: ${err.message}`);
            return returnState();
          }

          for (const event of batch.events) {
            if (signal.aborted) {
              break;
            }
            try {
              await subscription.handler(event);
            } catch (err) {
              // Stop before advancing past the failed event so it is retried
              // (at-least-once + idempotent handlers). Head-of-line blocking on
              // a poison event is a known prototype limitation.
              logger.error(
                `event bus durable consumer "${consumer}" handler failed for event ${event.id}: ${err.message}`
              );
              return returnState();
            }
            cursor = cursorFromEvent(event.timestamp, event.id);
          }

          return returnState();
        },
      }),
    },
  });
};

export interface ScheduleDurableConsumerDeps {
  taskManager: TaskManagerStartContract;
  consumer: string;
  types: string[];
  startTs: number;
  intervalMs: number;
}

const toInterval = (ms: number): string => `${Math.max(1, Math.round(ms / 1000))}s`;

/**
 * Idempotently schedules the recurring durable consumer task for a logical
 * consumer. Uses `ensureScheduled` so a Kibana restart does not create
 * duplicates; the persisted cursor survives in the task's state.
 */
export const scheduleDurableConsumer = ({
  taskManager,
  consumer,
  types,
  startTs,
  intervalMs,
}: ScheduleDurableConsumerDeps): Promise<unknown> =>
  taskManager.ensureScheduled({
    id: durableConsumerTaskId(consumer),
    taskType: DURABLE_CONSUMER_TASK_TYPE,
    schedule: { interval: toInterval(intervalMs) },
    params: { consumer, types, startTs },
    state: { cursor: null },
  });
