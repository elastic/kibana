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
  type System,
} from '@kbn/streams-schema';
import pLimit from 'p-limit';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { createDefaultSignificantEventsToolUsage } from '@kbn/streams-ai';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import type { TaskContext } from '.';
import type { TaskParams } from '../types';
import { PromptsConfigService } from '../../saved_objects/significant_events/prompts_config_service';
import { cancellableTask } from '../cancellable_task';
import { generateSignificantEventDefinitions } from '../../significant_events/generate_significant_events';

export interface SignificantEventsQueriesGenerationTaskParams {
  connectorId: string;
  start: number;
  end: number;
  systems?: System[];
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

              const { connectorId, start, end, systems, sampleDocsSize, streamName, _task } =
                runContext.taskInstance
                  .params as TaskParams<SignificantEventsQueriesGenerationTaskParams>;

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

                // If no systems are passed, generate for all data
                // If systems are passed, generate for each system with concurrency limit
                const systemsToProcess: Array<System | undefined> =
                  systems && systems.length > 0 ? systems : [undefined];

                // Process systems with concurrency limit to avoid overwhelming the LLM provider
                const CONCURRENCY_LIMIT = 3;
                const limiter = pLimit(CONCURRENCY_LIMIT);

                const resultsArray = await Promise.all(
                  systemsToProcess.map((system) =>
                    limiter(() =>
                      generateSignificantEventDefinitions(
                        {
                          definition: stream,
                          connectorId,
                          start,
                          end,
                          system,
                          sampleDocsSize,
                          systemPrompt: significantEventsPromptOverride,
                        },
                        {
                          inferenceClient,
                          esClient,
                          featureClient,
                          logger: taskContext.logger.get('significant_events_generation'),
                          signal: runContext.abortController.signal,
                        }
                      )
                    )
                  )
                );

                // Combine results from all parallel generations in a single pass
                const combinedResults =
                  resultsArray.reduce<SignificantEventsQueriesGenerationResult>(
                    (acc, result) => {
                      acc.queries.push(...result.queries);
                      acc.tokensUsed.prompt += result.tokensUsed.prompt;
                      acc.tokensUsed.completion += result.tokensUsed.completion;
                      return acc;
                    },
                    { queries: [], tokensUsed: { prompt: 0, completion: 0 } }
                  );

                const toolUsage = resultsArray.reduce((acc, result) => {
                  acc.get_stream_features.calls += result.toolUsage.get_stream_features.calls;
                  acc.get_stream_features.failures += result.toolUsage.get_stream_features.failures;
                  acc.get_stream_features.latency_ms +=
                    result.toolUsage.get_stream_features.latency_ms;
                  acc.add_queries.calls += result.toolUsage.add_queries.calls;
                  acc.add_queries.failures += result.toolUsage.add_queries.failures;
                  acc.add_queries.latency_ms += result.toolUsage.add_queries.latency_ms;
                  return acc;
                }, createDefaultSignificantEventsToolUsage());

                taskContext.telemetry.trackSignificantEventsQueriesGenerated({
                  count: combinedResults.queries.length,
                  systems_count: systems?.length ?? 0,
                  stream_name: stream.name,
                  stream_type: getStreamTypeFromDefinition(stream),
                  input_tokens_used: combinedResults.tokensUsed.prompt,
                  output_tokens_used: combinedResults.tokensUsed.completion,
                  tool_usage: toolUsage,
                });

                await taskClient.complete<
                  SignificantEventsQueriesGenerationTaskParams,
                  SignificantEventsQueriesGenerationResult
                >(
                  _task,
                  { connectorId, start, end, systems, sampleDocsSize, streamName },
                  combinedResults
                );
              } catch (error) {
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
                  { connectorId, start, end, systems, sampleDocsSize, streamName },
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
