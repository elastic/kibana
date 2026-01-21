/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import type { BaseFeature } from '@kbn/streams-schema';
import { identifyFeatures } from '@kbn/streams-ai';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import type { TaskContext } from '.';
import type { TaskParams } from '../types';
import { PromptsConfigService } from '../../saved_objects/significant_events/prompts_config_service';
import { cancellableTask } from '../cancellable_task';
import { getFeatureId } from '../../streams/feature/feature_client';

export interface FeaturesIdentificationTaskParams {
  connectorId: string;
  start: number;
  end: number;
}

export interface IdentifyFeaturesResult {
  features: BaseFeature[];
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

              const { connectorId, start, end, _task } = runContext.taskInstance
                .params as TaskParams<FeaturesIdentificationTaskParams>;
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
                const [stream, { featurePromptOverride }] = await Promise.all([
                  streamsClient.getStream(name),
                  new PromptsConfigService({
                    soClient,
                    logger: taskContext.logger,
                  }).getPrompt(),
                ]);

                const boundInferenceClient = inferenceClient.bindTo({ connectorId });
                const esClient = scopedClusterClient.asCurrentUser;

                const { features: baseFeatures } = await identifyFeatures({
                  start,
                  end,
                  esClient,
                  inferenceClient: boundInferenceClient,
                  logger: taskContext.logger.get('features_identification'),
                  stream,
                  signal: runContext.abortController.signal,
                  systemPrompt: featurePromptOverride,
                });

                const now = new Date().toISOString();
                const features = baseFeatures.map((feature) => ({
                  ...feature,
                  status: 'active' as const,
                  last_seen: now,
                  id: getFeatureId(stream.name, feature),
                }));

                await featureClient.bulk(
                  stream.name,
                  features.map((feature) => ({ index: { feature } }))
                );

                await taskClient.complete<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
                  _task,
                  { connectorId, start, end },
                  { features }
                );
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

                await taskClient.fail<FeaturesIdentificationTaskParams>(
                  _task,
                  { connectorId, start, end },
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
