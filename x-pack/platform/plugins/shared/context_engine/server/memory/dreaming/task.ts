/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { TaskCost } from '@kbn/task-manager-plugin/server';
import {
  CONTEXT_ENGINE_MEMORY_INFERENCE_FEATURE_ID,
  MEMORY_DREAMING_TASK_TYPE,
} from '../../../common/memory';
import type { RunDreamResult } from './run_dream';
import { runDream } from './run_dream';
import { countShortTermRevisions } from './read_window';
import { deleteLongTermMemories } from './rebuild';
import { MANUAL_DREAMING_RUN_AT } from './schedule';
import type { MemoryDreamingTaskParams } from './types';
import type { MemoryDreamingTaskState } from './task_state';
import { stateSchemaByVersion } from './task_state';

const MAX_ERROR_LENGTH = 1000;
/** Delay before the next run while a dream is catching up on a backlog. */
export const CATCH_UP_DELAY_MS = 60 * 1000;

export interface MemoryDreamingTaskDeps {
  /** Internal user; dreaming reads and writes the memory stores with it. */
  esClient: ElasticsearchClient;
  inference: InferenceServerStart;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  isMemoryEnabled: () => Promise<boolean>;
  isContextEngineEnabled: (spaceId: string) => Promise<boolean>;
  /** The space's dreaming interval setting, already validated. */
  getInterval: (spaceId: string) => Promise<string>;
}

export class MemoryDreamingCredentialsError extends Error {
  constructor() {
    super(
      'Dreaming has no credentials to call the model with. Turn dreaming off and on again to run it as you.'
    );
    this.name = 'MemoryDreamingCredentialsError';
  }
}

/** The connector set for the memory inference feature, or the default connector. */
export const resolveDreamConnectorId = async ({
  request,
  inference,
  searchInferenceEndpoints,
}: {
  request: KibanaRequest;
  inference: InferenceServerStart;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
}): Promise<string> => {
  const featureConnectorId = searchInferenceEndpoints
    ? (
        await searchInferenceEndpoints.endpoints.getForFeature(
          CONTEXT_ENGINE_MEMORY_INFERENCE_FEATURE_ID,
          request
        )
      ).endpoints[0]?.connectorId
    : undefined;
  if (featureConnectorId) {
    return featureConnectorId;
  }
  const defaultConnector = await inference.getDefaultConnector(request);
  if (!defaultConnector) {
    throw new Error('No AI connector is available for memory dreaming.');
  }
  return defaultConnector.connectorId;
};

const toErrorMessage = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).slice(0, MAX_ERROR_LENGTH);

/** The state after a run that reached the model, including runs where some types failed. */
const toRunState = ({
  result,
  previous,
  runStart,
  pendingMemories,
}: {
  result: RunDreamResult;
  previous: MemoryDreamingTaskState;
  runStart: Date;
  pendingMemories?: number;
}): MemoryDreamingTaskState => {
  const entries = Object.entries(result.types);
  const failed = entries.filter(([, { error }]) => error !== undefined);
  const lastRunStatus =
    failed.length === 0 ? 'success' : failed.length === entries.length ? 'failed' : 'partial';
  const runs = entries.map(([, run]) => run);
  return {
    lastDreamAt: lastRunStatus === 'failed' ? previous.lastDreamAt : runStart.toISOString(),
    lastRunAt: runStart.toISOString(),
    lastRunStatus,
    ...(failed.length > 0
      ? {
          lastError: failed
            .map(([type, { error }]) => `${type}: ${error}`)
            .join('\n')
            .slice(0, MAX_ERROR_LENGTH),
        }
      : {}),
    ...(lastRunStatus === 'failed'
      ? {}
      : {
          lastRunMemoriesRead: Math.max(0, ...runs.map(({ memoriesRead }) => memoriesRead)),
          lastRunApplied: runs.reduce((sum, { applied }) => sum + applied, 0),
          lastRunSkipped: runs.reduce((sum, { skipped }) => sum + skipped, 0),
        }),
    cursors: Object.fromEntries(entries.map(([type, { cursor }]) => [type, cursor])),
    lastRunTypes: Object.fromEntries(
      entries.map(([type, { memoriesRead, applied, skipped, batches, error }]) => [
        type,
        { memoriesRead, applied, skipped, batches, ...(error !== undefined ? { error } : {}) },
      ])
    ),
    catchingUp: !result.caughtUp,
    ...(pendingMemories !== undefined ? { pendingMemories } : {}),
  };
};

/** Registers the per-space dreaming task type. Each run is a no-op while memory is off. */
export const registerMemoryDreamingTaskDefinition = ({
  taskManager,
  getDeps,
  logger,
}: {
  taskManager: TaskManagerSetupContract;
  getDeps: () => Promise<MemoryDreamingTaskDeps>;
  logger: Logger;
}): void => {
  taskManager.registerTaskDefinitions({
    [MEMORY_DREAMING_TASK_TYPE]: {
      title: 'Context Engine memory dreaming',
      description: "Distills a space's short-term memories into long-term memories, such as facts.",
      timeout: '15m',
      maxAttempts: 1,
      cost: TaskCost.Normal,
      stateSchemaByVersion,
      createTaskRunner: ({ taskInstance, fakeRequest, signal }) => ({
        async run() {
          const state = (taskInstance.state ?? {}) as MemoryDreamingTaskState;
          const {
            spaceId,
            scheduled = true,
            rebuild = false,
          } = taskInstance.params as MemoryDreamingTaskParams;
          const rebuilding = rebuild && !state.catchingUp;
          const deps = await getDeps();
          const interval = await deps.getInterval(spaceId);
          const nextRun = !scheduled
            ? { runAt: MANUAL_DREAMING_RUN_AT }
            : interval !== taskInstance.schedule?.interval
            ? { schedule: { interval } }
            : {};

          if (!(await deps.isMemoryEnabled()) || !(await deps.isContextEngineEnabled(spaceId))) {
            return { state, ...nextRun };
          }

          const runStart = new Date();
          let deletedLongTerm = false;
          try {
            if (!fakeRequest) {
              throw new MemoryDreamingCredentialsError();
            }
            const connectorId = await resolveDreamConnectorId({
              request: fakeRequest,
              inference: deps.inference,
              searchInferenceEndpoints: deps.searchInferenceEndpoints,
            });
            if (rebuilding) {
              deletedLongTerm = true;
              const deleted = await deleteLongTermMemories({
                esClient: deps.esClient,
                spaceId,
                signal,
              });
              logger.info(
                `Rebuilding long-term memory in space '${spaceId}': deleted ${deleted} long-term memories`
              );
            }
            const result = await runDream({
              esClient: deps.esClient,
              inferenceClient: deps.inference.getClient({ request: fakeRequest }),
              connectorId,
              spaceId,
              cursors: rebuilding ? undefined : state.cursors,
              runStart,
              logger,
              signal,
            });
            const pendingMemories =
              result.behindFrom !== undefined
                ? await countShortTermRevisions({
                    esClient: deps.esClient,
                    spaceId,
                    from: result.behindFrom,
                    signal,
                  }).catch(() => undefined)
                : undefined;
            const nextState = toRunState({ result, previous: state, runStart, pendingMemories });
            logger.debug(
              `Dream in space '${spaceId}' finished with status '${
                nextState.lastRunStatus
              }': ${JSON.stringify(nextState.lastRunTypes)}`
            );
            return {
              state: nextState,
              ...(result.caughtUp ? nextRun : { runAt: new Date(Date.now() + CATCH_UP_DELAY_MS) }),
            };
          } catch (error) {
            const message = toErrorMessage(error);
            logger.warn(`Dream in space '${spaceId}' failed: ${message}`);
            const { lastDreamAt, cursors } = state;
            const nextState: MemoryDreamingTaskState = {
              lastDreamAt,
              lastRunAt: runStart.toISOString(),
              lastRunStatus: 'failed',
              lastError: message,
              ...(cursors !== undefined && !deletedLongTerm ? { cursors } : {}),
            };
            return { state: nextState, ...nextRun };
          }
        },
      }),
    },
  });
};
