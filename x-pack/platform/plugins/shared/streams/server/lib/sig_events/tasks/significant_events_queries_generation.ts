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
  STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  type SignificantEventsQueriesGenerationResult,
} from '@kbn/streams-schema';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import { parseError } from '../../streams/errors/parse_error';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import { resolveConnectorForFeature } from '../../../routes/utils/resolve_connector_for_feature';
import type { TaskContext } from '../../tasks/task_definitions';
import type { TaskParams } from '../../tasks/types';
import { PromptsConfigService } from '../saved_objects/prompts_config_service';
import { cancellableTask } from '../../tasks/cancellable_task';
import { generateSignificantEventDefinitions } from '../generate_significant_events';
import { isDefinitionNotFoundError } from '../../streams/errors/definition_not_found_error';

export interface SignificantEventsQueriesGenerationTaskParams {
  start: number;
  end: number;
  sampleDocsSize?: number;
  streamName: string;
  connectorId?: string;
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
              const { fakeRequest } = runContext;

              const {
                start,
                end,
                sampleDocsSize,
                streamName,
                connectorId: connectorIdOverride,
                _task,
              } = runContext.taskInstance
                .params as TaskParams<SignificantEventsQueriesGenerationTaskParams>;

              const {
                taskClient,
                streamsClient,
                inferenceClient,
                soClient,
                getFeatureClient,
                getQueryClient,
                scopedClusterClient,
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              const featureClient = await getFeatureClient();

              const taskLogger = taskContext.logger.get('significant_events_queries_generation');
              const connectorId =
                connectorIdOverride ??
                (await resolveConnectorForFeature({
                  searchInferenceEndpoints: taskContext.server.searchInferenceEndpoints,
                  featureId: STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
                  featureName: 'query generation',
                  request: fakeRequest,
                }));
              taskLogger.debug(`Using connector ${connectorId} for rule generation`);

              try {
                const stream = await streamsClient.getStream(streamName);

                const esClient = scopedClusterClient.asCurrentUser;
                const queryClient = await getQueryClient();

                const promptsConfigService = new PromptsConfigService({
                  soClient,
                  logger: taskContext.logger,
                });

                const { significantEventsPromptOverride } = await promptsConfigService.getPrompt();

                const result = await generateSignificantEventDefinitions(
                  {
                    definition: stream,
                    connectorId,
                    systemPrompt: significantEventsPromptOverride,
                  },
                  {
                    inferenceClient,
                    esClient,
                    featureClient,
                    queryClient,
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
                >(
                  _task,
                  { start, end, sampleDocsSize, streamName, connectorId: connectorIdOverride },
                  result
                );
              } catch (error) {
                if (isDefinitionNotFoundError(error)) {
                  taskContext.logger.debug(
                    `Stream ${streamName} was deleted before significant events queries generation task started, skipping`
                  );
                  return getDeleteTaskRunResult();
                }

                // Get connector info for error enrichment, preserving the original error if lookup fails
                let errorMessage = parseError(error).message;
                try {
                  const connector = await inferenceClient.getConnectorById(connectorId);
                  if (isInferenceProviderError(error)) {
                    errorMessage = formatInferenceProviderError(error, connector);
                  }
                } catch {
                  // Connector lookup failed — use the original error message
                }

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
                  {
                    start,
                    end,
                    sampleDocsSize,
                    streamName,
                    connectorId: connectorIdOverride,
                  },
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
