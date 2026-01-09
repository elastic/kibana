/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import { isInferenceProviderError } from '@kbn/inference-common';
import type { GeneratedSignificantEventQuery, System } from '@kbn/streams-schema';
import { getStreamTypeFromDefinition } from '@kbn/streams-schema';
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
}

export interface SignificantEventsQueriesGenerationResult {
  queries: GeneratedSignificantEventQuery[];
  tokensUsed: ChatCompletionTokenCount;
}

export const SIGNIFICANT_EVENTS_QUERIES_GENERATION_TASK_TYPE =
  'streams_significant_events_queries_generation';

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

              const { connectorId, start, end, systems, sampleDocsSize, _task } = runContext
                .taskInstance.params as TaskParams<SignificantEventsQueriesGenerationTaskParams>;
              const { stream: name } = _task;

              const { taskClient, scopedClusterClient, streamsClient, inferenceClient, soClient } =
                await taskContext.getScopedClients({
                  request: runContext.fakeRequest,
                });

              try {
                const stream = await streamsClient.getStream(name);

                const esClient = scopedClusterClient.asCurrentUser;

                const promptsConfigService = new PromptsConfigService({
                  soClient,
                  logger: taskContext.logger,
                });

                const { significantEventsPromptOverride } = await promptsConfigService.getPrompt();

                // If no systems are passed, generate for all data (single call with no feature)
                // If systems are passed, generate for each feature with concurrency limit
                const systemsToProcess: Array<System | undefined> =
                  systems && systems.length > 0 ? systems : [undefined];

                // Process systems in batches to avoid overwhelming the LLM provider
                const CONCURRENCY_LIMIT = 3;
                const resultsArray: Array<{
                  queries: GeneratedSignificantEventQuery[];
                  tokensUsed: ChatCompletionTokenCount;
                }> = [];

                for (let i = 0; i < systemsToProcess.length; i += CONCURRENCY_LIMIT) {
                  const batch = systemsToProcess.slice(i, i + CONCURRENCY_LIMIT);
                  const batchResults = await Promise.all(
                    batch.map((system) =>
                      generateSignificantEventDefinitions(
                        {
                          definition: stream,
                          connectorId,
                          start,
                          end,
                          system,
                          sampleDocsSize,
                          systemPromptOverride: significantEventsPromptOverride,
                        },
                        {
                          inferenceClient,
                          esClient,
                          logger: taskContext.logger.get('significant_events_generation'),
                          signal: runContext.abortController.signal,
                        }
                      )
                    )
                  );
                  resultsArray.push(...batchResults);
                }

                // Combine results from all parallel generations in a single pass
                const combinedResults =
                  resultsArray.reduce<SignificantEventsQueriesGenerationResult>(
                    (acc, result) => {
                      acc.queries.push(...result.queries);
                      acc.tokensUsed.prompt += result.tokensUsed.prompt;
                      acc.tokensUsed.completion += result.tokensUsed.completion;
                      acc.tokensUsed.total += result.tokensUsed.total ?? 0;
                      return acc;
                    },
                    { queries: [], tokensUsed: { prompt: 0, completion: 0, total: 0 } }
                  );

                taskContext.telemetry.trackSignificantEventsQueriesGenerated({
                  count: combinedResults.queries.length,
                  systems_count: systems?.length ?? 0,
                  stream_name: stream.name,
                  stream_type: getStreamTypeFromDefinition(stream),
                  input_tokens_used: combinedResults.tokensUsed.prompt,
                  output_tokens_used: combinedResults.tokensUsed.completion,
                });

                await taskClient.update<
                  SignificantEventsQueriesGenerationTaskParams,
                  SignificantEventsQueriesGenerationResult
                >({
                  ..._task,
                  status: 'completed',
                  task: {
                    params: {
                      connectorId,
                      start,
                      end,
                      systems,
                      sampleDocsSize,
                    },
                    payload: combinedResults,
                  },
                });
              } catch (error) {
                // Get connector info for error enrichment
                const connector = await inferenceClient.getConnectorById(connectorId);

                const errorMessage = isInferenceProviderError(error)
                  ? formatInferenceProviderError(error, connector)
                  : error.message;

                if (
                  errorMessage.includes('ERR_CANCELED') ||
                  errorMessage.includes('Request was aborted')
                ) {
                  return;
                }

                taskContext.logger.error(
                  `Task ${runContext.taskInstance.id} failed: ${errorMessage}`
                );

                await taskClient.update<SignificantEventsQueriesGenerationTaskParams>({
                  ..._task,
                  status: 'failed',
                  task: {
                    params: {
                      connectorId,
                      start,
                      end,
                      systems,
                      sampleDocsSize,
                    },
                    error: errorMessage,
                  },
                });
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
