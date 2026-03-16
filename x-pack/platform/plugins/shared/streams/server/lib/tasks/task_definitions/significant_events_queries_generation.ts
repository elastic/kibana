/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import {
  getStreamTypeFromDefinition,
  type SignificantEventsQueriesGenerationResult,
} from '@kbn/streams-schema';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import type { TaskContext } from '.';
import type { TaskParams } from '../types';
import { PromptsConfigService } from '../../saved_objects/significant_events/prompts_config_service';
import { cancellableTask } from '../cancellable_task';
import { generateSignificantEventDefinitions } from '../../significant_events/generate_significant_events';
import { isDefinitionNotFoundError } from '../../streams/errors/definition_not_found_error';

export interface SignificantEventsQueriesGenerationTaskParams {
  connectorId: string;
  start: number;
  end: number;
  sampleDocsSize?: number;
  streamName: string;
}

export const SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE =
  'streams_significant_events_queries_generation';

export function getSignificantEventsQueriesGenerationTaskId(streamName: string) {
  return `${SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE}_${streamName}`;
}

export function createStreamsSignificantEventsQueriesGenerationTask(taskContext: TaskContext) {
  return {
    [SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { connectorId, start, end, sampleDocsSize, streamName, _task } = runContext
                .taskInstance.params as TaskParams<SignificantEventsQueriesGenerationTaskParams>;

              const {
                taskClient,
                streamsClient,
                inferenceClient,
                soClient,
                featureClient,
                scopedClusterClient,
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              try {
                const stream = await streamsClient.getStream(streamName);

                const esClient = scopedClusterClient.asCurrentUser;

                const promptsConfigService = new PromptsConfigService({
                  soClient,
                  logger: taskContext.logger,
                });

                const { significantEventsPromptOverride } = await promptsConfigService.getPrompt();

                const result = await generateSignificantEventDefinitions(
                  {
                    definition: stream,
                    connectorId,
                    start,
                    end,
                    systemPrompt: significantEventsPromptOverride,
                  },
                  {
                    inferenceClient,
                    esClient,
                    featureClient,
                    logger: taskContext.logger.get('significant_events_generation'),
                    signal: runContext.abortController.signal,
                  }
                );

                taskContext.telemetry.trackSignificantEventsQueriesGenerated({
                  count: result.queries.length,
                  stream_name: stream.name,
                  stream_type: getStreamTypeFromDefinition(stream),
                  input_tokens_used: result.tokensUsed.prompt,
                  output_tokens_used: result.tokensUsed.completion,
                  tool_usage: result.toolUsage,
                });

                await taskClient.complete<
                  SignificantEventsQueriesGenerationTaskParams,
                  SignificantEventsQueriesGenerationResult
                >(_task, { connectorId, start, end, sampleDocsSize, streamName }, result);
              } catch (error) {
                if (isDefinitionNotFoundError(error)) {
                  taskContext.logger.debug(
                    `Stream ${streamName} was deleted before significant events queries generation task started, skipping`
                  );
                  return getDeleteTaskRunResult();
                }

                // Get connector info for error enrichment
                const connector = await inferenceClient.getConnectorById(connectorId);

                const errorMessage = isInferenceProviderError(error)
                  ? formatInferenceProviderError(error, connector)
                  : getErrorMessage(error);

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return getDeleteTaskRunResult();
                }

                taskContext.logger.error(
                  `Task ${runContext.taskInstance.id} failed: ${errorMessage}`
                );

                await taskClient.fail<SignificantEventsQueriesGenerationTaskParams>(
                  _task,
                  { connectorId, start, end, sampleDocsSize, streamName },
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
