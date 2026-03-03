/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import {
  type IdentifyFeaturesResult,
  type BaseFeature,
  isComputedFeature,
  getStreamTypeFromDefinition,
} from '@kbn/streams-schema';
import { identifyFeatures, generateAllComputedFeatures } from '@kbn/streams-ai';
import { getSampleDocuments } from '@kbn/ai-tools/src/tools/describe_dataset/get_sample_documents';
import { v4 as uuid, v5 as uuidv5 } from 'uuid';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LogMeta } from '@kbn/logging';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import type { TaskContext } from '.';
import type { TaskParams } from '../types';
import { PromptsConfigService } from '../../saved_objects/significant_events/prompts_config_service';
import { cancellableTask } from '../cancellable_task';
import { MAX_FEATURE_AGE_MS } from '../../streams/feature/feature_client';
import { isDefinitionNotFoundError } from '../../streams/errors/definition_not_found_error';
import type { StreamsFeaturesIdentifiedProps } from '../../telemetry';

export interface FeaturesIdentificationTaskParams {
  connectorId: string;
  start: number;
  end: number;
  streamName: string;
}

export const FEATURES_IDENTIFICATION_TASK_TYPE = 'streams_features_identification';

export function getFeaturesIdentificationTaskId(streamName: string) {
  return `${FEATURES_IDENTIFICATION_TASK_TYPE}_${streamName}`;
}

export function createStreamsFeaturesIdentificationTask(taskContext: TaskContext) {
  return {
    [FEATURES_IDENTIFICATION_TASK_TYPE]: {
      createTaskRunner: (runContext) => {
        return {
          run: cancellableTask(
            async () => {
              if (!runContext.fakeRequest) {
                throw new Error('Request is required to run this task');
              }

              const taskStart = Date.now();
              const { connectorId, start, end, streamName, _task } = runContext.taskInstance
                .params as TaskParams<FeaturesIdentificationTaskParams>;

              const telemetryProps: StreamsFeaturesIdentifiedProps = {
                total_duration_ms: 0,
                identification_duration_ms: 0,
                stream_name: streamName,
                stream_type: 'unknown',
                input_tokens_used: 0,
                output_tokens_used: 0,
                total_tokens_used: 0,
                inferred_total_count: 0,
                inferred_dedup_count: 0,
                state: 'success',
              };

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
                const [stream, { featurePromptOverride }] = await Promise.all([
                  streamsClient.getStream(streamName),
                  new PromptsConfigService({
                    soClient,
                    logger: taskContext.logger,
                  }).getPrompt(),
                ]);

                telemetryProps.stream_type = getStreamTypeFromDefinition(stream);

                const boundInferenceClient = inferenceClient.bindTo({ connectorId });
                const esClient = scopedClusterClient.asCurrentUser;

                const { hits: sampleDocuments } = await getSampleDocuments({
                  esClient,
                  index: stream.name,
                  start,
                  end,
                  size: 20,
                });

                const identifyFeaturesStart = Date.now();
                const [{ features: inferredBaseFeatures }, computedFeatures] = await Promise.all([
                  identifyFeatures({
                    streamName: stream.name,
                    sampleDocuments,
                    inferenceClient: boundInferenceClient,
                    logger: taskContext.logger.get('features_identification'),
                    signal: runContext.abortController.signal,
                    systemPrompt: featurePromptOverride,
                  })
                    .then((result) => {
                      telemetryProps.input_tokens_used = result.tokensUsed.prompt;
                      telemetryProps.output_tokens_used = result.tokensUsed.completion;
                      telemetryProps.total_tokens_used = result.tokensUsed.total;
                      return result;
                    })
                    .finally(() => {
                      telemetryProps.identification_duration_ms =
                        Date.now() - identifyFeaturesStart;
                    }),
                  generateAllComputedFeatures({
                    stream,
                    start,
                    end,
                    esClient,
                    logger: taskContext.logger.get('computed_features'),
                  }),
                ]);

                const identifiedFeatures: BaseFeature[] = [
                  ...inferredBaseFeatures,
                  ...computedFeatures,
                ];

                const { hits: existingFeatures } = await featureClient.getFeatures(stream.name);

                let newFeaturesCount = inferredBaseFeatures.length;
                const now = Date.now();
                const features = identifiedFeatures.map((feature) => {
                  const existing = featureClient.findDuplicateFeature({
                    existingFeatures,
                    feature,
                  });
                  const isComputed = isComputedFeature(feature);
                  if (existing && !isComputed) {
                    newFeaturesCount--;
                    taskContext.logger.debug(
                      () =>
                        `Overwriting feature with id [${
                          feature.id
                        }] since it already exists.\nExisting feature: ${JSON.stringify(
                          existing
                        )}\nNew feature: ${JSON.stringify(feature)}`
                    );
                  }
                  return {
                    ...feature,
                    status: 'active' as const,
                    last_seen: new Date(now).toISOString(),
                    expires_at: new Date(now + MAX_FEATURE_AGE_MS).toISOString(),
                    uuid: isComputed
                      ? uuidv5(`${streamName}:${feature.id}`, uuidv5.DNS)
                      : existing?.uuid ?? uuid(),
                  };
                });

                await featureClient.bulk(
                  stream.name,
                  features.map((feature) => ({ index: { feature } }))
                );

                await taskClient.complete<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
                  _task,
                  { connectorId, start, end, streamName },
                  { features }
                );

                taskContext.telemetry.trackFeaturesIdentified({
                  ...telemetryProps,
                  inferred_total_count: inferredBaseFeatures.length,
                  inferred_dedup_count: newFeaturesCount,
                  total_duration_ms: Date.now() - taskStart,
                  state: 'success',
                });
              } catch (error) {
                if (isDefinitionNotFoundError(error)) {
                  taskContext.logger.debug(
                    () =>
                      `Stream ${streamName} was deleted before features identification task started, skipping`
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
                  taskContext.logger.debug(
                    () => `Task ${runContext.taskInstance.id} was canceled: ${errorMessage}`
                  );
                  taskContext.telemetry.trackFeaturesIdentified({
                    ...telemetryProps,
                    total_duration_ms: Date.now() - taskStart,
                    state: 'canceled',
                  });
                  return getDeleteTaskRunResult();
                }

                taskContext.logger.error(
                  `Task ${runContext.taskInstance.id} failed: ${errorMessage}`,
                  { error } as LogMeta
                );

                await taskClient.fail<FeaturesIdentificationTaskParams>(
                  _task,
                  { connectorId, start, end, streamName },
                  errorMessage
                );

                taskContext.telemetry.trackFeaturesIdentified({
                  ...telemetryProps,
                  total_duration_ms: Date.now() - taskStart,
                  state: 'failure',
                });

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
