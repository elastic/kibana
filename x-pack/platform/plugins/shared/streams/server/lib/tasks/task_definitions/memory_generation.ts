/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { BaseFeature, GeneratedSignificantEventQuery, Insight } from '@kbn/streams-schema';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { resolveConnectorForSignificantEventsDiscovery } from '../../../routes/utils/resolve_connector_for_feature';
import { generateMemory } from '../../sig_events/memory_generation';

export interface MemoryGenerationTaskParams {
  insights?: Insight[];
  features?: BaseFeature[];
  queries?: Array<{ streamName: string; query: GeneratedSignificantEventQuery }>;
}

export interface MemoryGenerationTaskResult {
  streamsProcessed: number;
}

export const MEMORY_GENERATION_TASK_TYPE = 'streams_memory_generation';

export function createStreamsMemoryGenerationTask(taskContext: TaskContext) {
  return {
    [MEMORY_GENERATION_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { insights, features, queries, _task } = runContext.taskInstance
                .params as TaskParams<MemoryGenerationTaskParams>;

              const { taskClient, inferenceClient, uiSettingsClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const taskLogger = taskContext.logger.get('memory_generation');

              const useMemory = await uiSettingsClient.get<boolean>(
                OBSERVABILITY_STREAMS_ENABLE_MEMORY
              );

              if (!useMemory) {
                taskLogger.info('Memory is disabled, skipping memory generation');
                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { insights, features, queries },
                  { streamsProcessed: 0 }
                );
                return;
              }

              const connectorId = await resolveConnectorForSignificantEventsDiscovery({
                searchInferenceEndpoints: taskContext.server.searchInferenceEndpoints,
                request: runContext.fakeRequest,
              });
              taskLogger.info(
                `Using connector ${connectorId} for memory generation (discovery model)`
              );

              try {
                const result = await generateMemory(
                  { insights, features, queries },
                  {
                    inferenceClient,
                    connectorId,
                    esClient: taskContext.getInternalEsClient(),
                    logger: taskLogger,
                    signal: runContext.abortController.signal,
                  }
                );

                await taskClient.complete<MemoryGenerationTaskParams, MemoryGenerationTaskResult>(
                  _task,
                  { insights, features, queries },
                  { streamsProcessed: result.streamsProcessed }
                );
              } catch (error) {
                const errorMessage = getErrorMessage(error);

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return getDeleteTaskRunResult();
                }

                taskLogger.error(`Task ${runContext.taskInstance.id} failed: ${errorMessage}`);

                await taskClient.fail<MemoryGenerationTaskParams>(
                  _task,
                  { insights, features, queries },
                  errorMessage
                );

                return getDeleteTaskRunResult();
              }
            },
            runContext,
            taskContext
          ),
        };
      },
    },
  } satisfies TaskDefinitionRegistry;
}
