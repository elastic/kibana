/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import { getStreamTypeFromDefinition, type FeatureType } from '@kbn/streams-schema';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import type { TaskContext } from '.';
import type { TaskParams } from '../types';
import type { IdentifyFeaturesResult } from '../../streams/feature/feature_type_registry';
import { getDefaultFeatureRegistry } from '../../streams/feature/feature_type_registry';
import { PromptsConfigService } from '../../saved_objects/significant_events/prompts_config_service';
import { cancellableTask } from '../cancellable_task';

export interface FeatureIdentificationTaskParams {
  connectorId: string;
  start: number;
  end: number;
}

export function createStreamsFeatureIdentificationTask(taskContext: TaskContext) {
  return {
    streams_feature_identification: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const { connectorId, start, end, _task } = runContext.taskInstance
                .params as TaskParams<FeatureIdentificationTaskParams>;
              const { stream: name } = _task;

              const {
                taskClient,
                scopedClusterClient,
                featureClient,
                streamsClient,
                inferenceClient,
                soClient,
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              try {
                const [{ hits }, stream] = await Promise.all([
                  featureClient.getFeatures(name),
                  streamsClient.getStream(name),
                ]);

                const boundInferenceClient = inferenceClient.bindTo({ connectorId });
                const esClient = scopedClusterClient.asCurrentUser;
                const featureRegistry = getDefaultFeatureRegistry();

                const promptsConfigService = new PromptsConfigService({
                  soClient,
                  logger: taskContext.logger,
                });

                const { featurePromptOverride, descriptionPromptOverride } =
                  await promptsConfigService.getPrompt();

                const results = await featureRegistry.identifyFeatures({
                  start,
                  end,
                  esClient,
                  inferenceClient: boundInferenceClient,
                  logger: taskContext.logger.get('feature_identification'),
                  stream,
                  features: hits,
                  signal: runContext.abortController.signal,
                  featurePromptOverride,
                  descriptionPromptOverride,
                });

                taskContext.telemetry.trackFeaturesIdentified({
                  count: results.features.length,
                  count_by_type: results.features.reduce<Record<FeatureType, number>>(
                    (acc, feature) => {
                      acc[feature.type] = (acc[feature.type] || 0) + 1;
                      return acc;
                    },
                    {
                      system: 0,
                    }
                  ),
                  stream_name: stream.name,
                  stream_type: getStreamTypeFromDefinition(stream),
                  input_tokens_used: results.tokensUsed.prompt,
                  output_tokens_used: results.tokensUsed.completion,
                });

                await taskClient.update<FeatureIdentificationTaskParams, IdentifyFeaturesResult>({
                  ..._task,
                  status: 'completed',
                  task: {
                    params: {
                      connectorId,
                      start,
                      end,
                    },
                    payload: results,
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

                await taskClient.update<FeatureIdentificationTaskParams>({
                  ..._task,
                  status: 'failed',
                  task: {
                    params: {
                      connectorId,
                      start,
                      end,
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
