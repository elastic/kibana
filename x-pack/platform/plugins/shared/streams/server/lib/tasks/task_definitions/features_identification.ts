/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import type { IdentifyFeaturesResult } from '@kbn/streams-schema';
import { isComputedFeature, type BaseFeature } from '@kbn/streams-schema';
import { identifyFeatures, generateAllComputedFeatures } from '@kbn/streams-ai';
import { v4 as uuid, v5 as uuidv5 } from 'uuid';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { ElasticsearchClient } from '@kbn/core/server';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import { discoverMessagePatterns } from '../../../routes/utils/discover_message_patterns';
import type { StreamsTaskType, TaskContext } from '.';
import type { TaskClient } from '../task_client';
import type { TaskParams } from '../types';
import { PromptsConfigService } from '../../saved_objects/significant_events/prompts_config_service';
import { cancellableTask } from '../cancellable_task';
import { MAX_FEATURE_AGE_MS } from '../../streams/feature/feature_client';

export interface DiscoveredPattern {
  pattern: string;
  discoveredAt: number;
}

/** Maximum age of a discovered pattern before it expires and can be re-discovered. */
export const PATTERN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface FeaturesIdentificationTaskParams {
  connectorId: string;
  start: number;
  end: number;
  streamName: string;
  discoveredPatterns: DiscoveredPattern[];
}

export const FEATURES_IDENTIFICATION_TASK_TYPE = 'streams_features_identification';

export function getFeaturesIdentificationTaskId(streamName: string) {
  return `${FEATURES_IDENTIFICATION_TASK_TYPE}_${streamName}`;
}

/**
 * Retrieves non-expired discovered patterns from the previous features
 * identification task for the given stream. Returns an empty array if
 * no previous task exists.
 */
export async function getPreviousDiscoveredPatterns(
  streamName: string,
  taskClient: TaskClient<StreamsTaskType>
): Promise<DiscoveredPattern[]> {
  try {
    const taskId = getFeaturesIdentificationTaskId(streamName);
    const previousTask = await taskClient.get<FeaturesIdentificationTaskParams>(taskId);
    const now = Date.now();
    return (previousTask.task.params.discoveredPatterns ?? []).filter(
      (p) => now - p.discoveredAt < PATTERN_TTL_MS
    );
  } catch {
    return [];
  }
}

const MIN_NEW_PATTERNS = 2;

const getSampleDocuments = async ({
  esClient,
  index,
  start,
  end,
  excludePatterns,
}: {
  esClient: ElasticsearchClient;
  index: string;
  start: number;
  end: number;
  excludePatterns: DiscoveredPattern[];
}) => {
  let resetPatterns = false;
  // Discover message patterns, excluding previously found ones
  let categories = await discoverMessagePatterns({
    esClient,
    index,
    start,
    end,
    excludePatterns: excludePatterns.map((p) => p.pattern),
  });

  // If we didn't find enough new patterns, try again without excluding patterns
  if (categories.length < MIN_NEW_PATTERNS) {
    resetPatterns = true;
    categories = await discoverMessagePatterns({
      esClient,
      index,
      start,
      end,
    });
  }

  const now = Date.now();

  const newPatterns: DiscoveredPattern[] = categories.map((c) => ({
    pattern: c.pattern,
    discoveredAt: now,
  }));

  const updatedPatterns = [
    ...(excludePatterns && !resetPatterns ? excludePatterns : []),
    ...newPatterns,
  ];

  return {
    updatedPatterns,
    sampleDocuments: categories.flatMap((c) => c.sampleDocuments),
  };
};

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

              const {
                connectorId,
                start,
                end,
                streamName,
                discoveredPatterns: previousPatterns,
                _task,
              } = runContext.taskInstance.params as TaskParams<FeaturesIdentificationTaskParams>;

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

                const boundInferenceClient = inferenceClient.bindTo({ connectorId });
                const esClient = scopedClusterClient.asCurrentUser;
                const { sampleDocuments, updatedPatterns } = await getSampleDocuments({
                  esClient,
                  index: stream.name,
                  start,
                  end,
                  excludePatterns: previousPatterns,
                });

                const [{ features: inferredBaseFeatures }, computedFeatures] = await Promise.all([
                  identifyFeatures({
                    streamName: stream.name,
                    sampleDocuments,
                    inferenceClient: boundInferenceClient,
                    logger: taskContext.logger.get('features_identification'),
                    signal: runContext.abortController.signal,
                    systemPrompt: featurePromptOverride,
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

                const { hits: existingFeatures } = await featureClient.getFeatures(stream.name, {
                  id: identifiedFeatures.map(({ id }) => id),
                });

                const now = Date.now();
                const features = identifiedFeatures.map((feature) => {
                  const existing = existingFeatures.find(({ id }) => id === feature.id);
                  if (existing) {
                    taskContext.logger.debug(
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
                    uuid: isComputedFeature(feature)
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
                  {
                    connectorId,
                    start,
                    end,
                    streamName,
                    discoveredPatterns: updatedPatterns,
                  },
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
                  return getDeleteTaskRunResult();
                }

                taskContext.logger.error(
                  `Task ${runContext.taskInstance.id} failed: ${errorMessage}`,
                  { error }
                );

                await taskClient.fail<FeaturesIdentificationTaskParams>(
                  _task,
                  {
                    connectorId,
                    start,
                    end,
                    streamName,
                    discoveredPatterns: previousPatterns,
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
