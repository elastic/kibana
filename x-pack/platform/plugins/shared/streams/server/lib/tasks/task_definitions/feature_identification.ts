/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import type { TaskContext } from '.';
import type { TaskParams } from '../types';
import { getDefaultFeatureRegistry } from '../../streams/feature/feature_type_registry';
import { PromptsConfigService } from '../../saved_objects/significant_events/prompts_config_service';

export interface FeatureIdentificationTaskParams {
  connectorId: string;
  start: number;
  end: number;
}

const abortControllers: Map<string, AbortController> = new Map();

export function createStreamsFeatureIdentificationTask(taskContext: TaskContext) {
  return {
    streams_feature_identification: {
      createTaskRunner: (runContext) => {
        return {
          run: async () => {
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

            // Get connector info for error enrichment
            const connector = await inferenceClient.getConnectorById(connectorId);

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

              const abortController = new AbortController();
              abortControllers.set(runContext.taskInstance.id, abortController);

              const results = await featureRegistry.identifyFeatures({
                start,
                end,
                esClient,
                inferenceClient: boundInferenceClient,
                logger: taskContext.logger.get('feature_identification'),
                stream,
                features: hits,
                signal: abortController.signal,
                featurePromptOverride,
                descriptionPromptOverride,
              });

              // I think I have to send the telemetry here

              await taskClient.update<FeatureIdentificationTaskParams>({
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
              const errorMessage = isInferenceProviderError(error)
                ? formatInferenceProviderError(error, connector)
                : error.message;

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
          cancel: async () => {
            if (abortControllers.has(runContext.taskInstance.id)) {
              const abortController = abortControllers.get(runContext.taskInstance.id)!;
              abortController.abort();
              abortControllers.delete(runContext.taskInstance.id);
            }
          },
        };
      },
    },
  } satisfies TaskDefinitionRegistry;
}
