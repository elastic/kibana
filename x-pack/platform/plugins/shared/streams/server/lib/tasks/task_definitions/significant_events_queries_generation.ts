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

                taskContext.telemetry.trackSignificantEventsQueriesGenerated({
                  count: combinedResults.queries.length,
                  systems_count: systems?.length ?? 0,
                  stream_name: stream.name,
                  stream_type: getStreamTypeFromDefinition(stream),
                  input_tokens_used: combinedResults.tokensUsed.prompt,
                  output_tokens_used: combinedResults.tokensUsed.completion,
                });

                await taskClient.complete<
                  SignificantEventsQueriesGenerationTaskParams,
                  SignificantEventsQueriesGenerationResult
                >(_task, { connectorId, start, end, systems, sampleDocsSize }, combinedResults);
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

                await taskClient.fail<SignificantEventsQueriesGenerationTaskParams>(
                  _task,
                  { connectorId, start, end, systems, sampleDocsSize },
                  errorMessage
                );
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
