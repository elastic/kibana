/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import { partitionStream } from '@kbn/streams-ai';
import { Streams } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { TaskContext } from '.';
import { cancellableTask } from '../cancellable_task';
import type { TaskParams } from '../types';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';

export interface PartitionSuggestionTaskParams {
  connectorId: string;
  streamName: string;
  start: number;
  end: number;
}

export interface PartitionSuggestionTaskPayload {
  partitions: Array<{ name: string; condition: Condition }>;
}

export const STREAMS_PARTITION_SUGGESTION_TASK_TYPE = 'streams_partition_suggestion';

export function getPartitionSuggestionTaskId(streamName: string): string {
  return `${STREAMS_PARTITION_SUGGESTION_TASK_TYPE}_${streamName}`;
}

export function createStreamsPartitionSuggestionTask(taskContext: TaskContext) {
  return {
    [STREAMS_PARTITION_SUGGESTION_TASK_TYPE]: {
      timeout: '30m',
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { connectorId, streamName, start, end, _task } = runContext.taskInstance
                .params as TaskParams<PartitionSuggestionTaskParams>;

              const { taskClient, scopedClusterClient, streamsClient, inferenceClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              const logger = taskContext.logger.get('partition_suggestion');

              try {
                const stream = await streamsClient.getStream(streamName);
                if (!Streams.ingest.all.Definition.is(stream)) {
                  throw new Error('Partitioning suggestions are only available for ingest streams');
                }

                const abortController = runContext.abortController;

                const partitions = await partitionStream({
                  definition: stream,
                  inferenceClient: inferenceClient.bindTo({ connectorId }),
                  esClient: scopedClusterClient.asCurrentUser,
                  logger,
                  start,
                  end,
                  maxSteps: 1,
                  signal: abortController.signal,
                });

                await taskClient.complete<
                  PartitionSuggestionTaskParams,
                  PartitionSuggestionTaskPayload
                >(_task, { connectorId, streamName, start, end }, { partitions });
              } catch (error) {
                const connector = await inferenceClient.getConnectorById(connectorId);

                const errorMessage = isInferenceProviderError(error)
                  ? formatInferenceProviderError(error, connector)
                  : error.message;

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return getDeleteTaskRunResult();
                }

                logger.error(`Task ${runContext.taskInstance.id} failed: ${errorMessage}`, {
                  error,
                });

                await taskClient.fail<PartitionSuggestionTaskParams>(
                  _task,
                  { connectorId, streamName, start, end },
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
