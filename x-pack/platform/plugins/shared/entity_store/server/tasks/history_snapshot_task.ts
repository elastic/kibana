/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  TaskCost,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { parseDurationToMs } from '../infra/time';
import { getHistorySnapshotTaskId, TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import type { EntityStoreCoreSetup } from '../types';
import { EntityStoreGlobalStateClient } from '../domain/saved_objects';
import { HistorySnapshotClient } from '../domain/history_snapshot';
import type { HistorySnapshotRun } from '../domain/history_snapshot';
import { cancelTask } from '../infra/elasticsearch';
import { getErrorMessage } from '../../common';
import { wrapTaskRun } from '../telemetry/traces';
import { shouldDeleteOrphanedEntityStoreTask } from './should_delete_orphaned_task';
import { buildEaExecutionContext, EA_EXECUTION_CONTEXT_NAMES } from './execution_context';

const config = TasksConfig[EntityStoreTaskType.enum.historySnapshot];

// Stop waiting well before the task timeout. Task Manager drops the state of a timed-out run,
// and the state carries the Elasticsearch task the next run resumes.
const RUN_DEADLINE_MS = 25 * 60 * 1000;
const RESUME_DELAY_MS = 60 * 1000;

const historySnapshotRunSchema = schema.object({
  phase: schema.oneOf([schema.literal('reindex'), schema.literal('reset')]),
  esTaskId: schema.string(),
  latestIndex: schema.string(),
  historySnapshotIndex: schema.string(),
  timestampNow: schema.string(),
  cycleStartedAt: schema.string(),
  phaseStartedAt: schema.string(),
  docCount: schema.maybe(schema.number()),
});

interface RunHistorySnapshotTaskParams {
  taskInstance: {
    state: Record<string, unknown>;
    id: string;
    schedule?: { interval?: string };
  };
  signal: AbortSignal;
  core: EntityStoreCoreSetup;
  logger: Logger;
}

async function runHistorySnapshotTask({
  taskInstance,
  signal,
  core,
  logger,
}: RunHistorySnapshotTaskParams): Promise<
  {
    state: Record<string, unknown>;
    shouldDeleteTask?: boolean;
  } & ({ schedule?: { interval: string }; runAt?: never } | { runAt?: Date; schedule?: never })
> {
  const namespace = taskInstance.state?.namespace as string | undefined;
  if (!namespace) {
    logger.error('History snapshot task missing namespace in state');
    return { state: taskInstance.state };
  }

  const [start, plugins] = await core.getStartServices();
  if (
    await shouldDeleteOrphanedEntityStoreTask({
      coreStart: start,
      namespace,
      logger,
    })
  ) {
    return { state: taskInstance.state, shouldDeleteTask: true };
  }

  const soClient = start.savedObjects.getUnsafeInternalClient().asScopedToNamespace(namespace);
  const esClient = start.elasticsearch.client.asInternalUser;
  const taskLogger = logger.get(taskInstance.id);

  const globalStateClient = new EntityStoreGlobalStateClient(soClient, namespace, taskLogger);
  const historySnapshotClient = new HistorySnapshotClient({
    logger: taskLogger,
    esClient,
    internalEsClient: esClient,
    namespace,
    globalStateClient,
    taskManager: plugins.taskManager,
  });

  const previousRun = taskInstance.state.run as HistorySnapshotRun | undefined;
  const result = await historySnapshotClient.runHistorySnapshot({
    abortSignal: signal,
    run: previousRun,
    deadline: Date.now() + RUN_DEADLINE_MS,
  });

  const state = { namespace };
  if ('inProgress' in result) {
    return { state: { ...state, run: result.run }, runAt: new Date(Date.now() + RESUME_DELAY_MS) };
  }

  // A run that was already in progress skips Task Manager's schedule update. Adopt the stored
  // interval when this run finishes so a concurrent config change is not lost.
  const currentInterval = taskInstance.schedule?.interval;
  try {
    const frequency = (await globalStateClient.find())?.historySnapshot.frequency;
    if (frequency && frequency !== currentInterval) {
      return { state, schedule: { interval: frequency } };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Error reading history snapshot frequency for reschedule, received ${message}`);
  }

  // A cycle that spanned several runs would otherwise push the next cycle back by its duration.
  if (previousRun && currentInterval) {
    const nextRunAt = Date.parse(previousRun.cycleStartedAt) + parseDurationToMs(currentInterval);
    if (nextRunAt > Date.now()) {
      return { state, runAt: new Date(nextRunAt) };
    }
  }

  return { state };
}

export function registerHistorySnapshotTask({
  taskManager,
  logger,
  core,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: EntityStoreCoreSetup;
}): void {
  const taskType = config.type;
  taskManager.registerTaskDefinitions({
    [taskType]: {
      title: config.title,
      timeout: config.timeout,
      cost: TaskCost.Normal,
      stateSchemaByVersion: {
        1: {
          up: (state: Record<string, unknown>) => ({
            namespace: typeof state.namespace === 'string' ? state.namespace : 'default',
          }),
          schema: schema.object({
            namespace: schema.string(),
          }),
        },
        2: {
          up: (state: Record<string, unknown>) => ({
            namespace: typeof state.namespace === 'string' ? state.namespace : 'default',
            ...(state.run != null && { run: state.run }),
          }),
          schema: schema.object({
            namespace: schema.string(),
            run: schema.maybe(historySnapshotRunSchema),
          }),
        },
      },
      createTaskRunner: ({ taskInstance, signal }) => ({
        run: async () => {
          const [coreStart] = await core.getStartServices();
          return coreStart.executionContext.withContext(
            buildEaExecutionContext(
              EA_EXECUTION_CONTEXT_NAMES.ENTITY_STORE_HISTORY_SNAPSHOT_TASK,
              taskInstance.id
            ),
            () =>
              wrapTaskRun({
                spanName: 'entityStore.task.history_snapshot.run',
                namespace: taskInstance.state.namespace,
                attributes: {
                  'entity_store.task.id': taskInstance.id,
                  'entity_store.task.type': taskType,
                },
                run: () =>
                  runHistorySnapshotTask({
                    taskInstance,
                    signal,
                    core,
                    logger,
                  }),
              })
          );
        },
      }),
    },
  });
}

export async function stopHistorySnapshotTask({
  logger,
  taskManager,
  esClient,
  namespace,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  esClient: ElasticsearchClient;
  namespace: string;
}): Promise<void> {
  const taskId = getHistorySnapshotTaskId(namespace);
  try {
    const { state } = await taskManager.get(taskId);
    const run = state.run as HistorySnapshotRun | undefined;
    if (run) {
      await cancelTask({ esClient, taskId: run.esTaskId, logger });
    }
  } catch (err) {
    logger.debug(`No unfinished history snapshot to cancel for ${taskId}: ${getErrorMessage(err)}`);
  }
  await taskManager.removeIfExists(taskId);
  logger.debug(`Stopped history snapshot task ${taskId}`);
}

export async function scheduleHistorySnapshotTasks({
  logger,
  taskManager,
  namespace,
  request,
  frequency,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  namespace: string;
  request: KibanaRequest;
  frequency: string;
}): Promise<void> {
  try {
    const taskId = getHistorySnapshotTaskId(namespace);
    // Delay the first run by the frequency interval (24h by default).
    const firstRunAt = new Date(Date.now() + parseDurationToMs(frequency));
    await taskManager.ensureScheduled(
      {
        id: taskId,
        taskType: config.type,
        runAt: firstRunAt,
        schedule: { interval: frequency },
        state: { namespace },
        params: {},
      },
      { request }
    );
    logger.debug(`Scheduled history snapshot task ${taskId} with interval ${frequency}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to schedule history snapshot tasks: ${message}`);
    throw err;
  }
}
