/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError } from '@kbn/inference-common';
import type { IgnoredFeature } from '@kbn/streams-schema';
import {
  type IdentifyFeaturesResult,
  type BaseFeature,
  type Feature,
  isComputedFeature,
  isDuplicateFeature,
  getStreamTypeFromDefinition,
  isFeatureWithFilter,
} from '@kbn/streams-schema';
import type { ExcludedFeatureSummary } from '@kbn/streams-ai';
import { identifyFeatures, generateAllComputedFeatures } from '@kbn/streams-ai';
import { v4 as uuid, v5 as uuidv5 } from 'uuid';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger, LogMeta } from '@kbn/logging';
import { parseError } from '../../../streams/errors/parse_error';
import { fetchSampleDocuments } from './fetch_sample_documents';
import { formatInferenceProviderError } from '../../../../routes/utils/create_connector_sse_error';
import { resolveConnectorId } from '../../../../routes/utils/resolve_connector_id';
import type { TaskContext } from '..';
import type { TaskParams } from '../../types';
import { PromptsConfigService } from '../../../saved_objects/significant_events/prompts_config_service';
import { cancellableTask } from '../../cancellable_task';
import type { FeatureClient } from '../../../streams/feature/feature_client';
import { MAX_FEATURE_AGE_MS } from '../../../streams/feature/feature_client';
import { isDefinitionNotFoundError } from '../../../streams/errors/definition_not_found_error';
import type { StreamsFeaturesIdentifiedProps } from '../../../telemetry';

const MAX_EXCLUDED_FEATURES_FOR_PROMPT = 10;

export interface FeaturesIdentificationTaskParams {
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
              const { start, end, streamName, _task } = runContext.taskInstance
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
                total_filters: 0,
                filters_capped: false,
                has_filtered_documents: false,
                excluded_features_count: 0,
                llm_ignored_count: 0,
                code_ignored_count: 0,
                state: 'success',
              };

              const {
                taskClient,
                scopedClusterClient,
                featureClient,
                streamsClient,
                inferenceClient,
                soClient,
                modelSettingsClient,
                uiSettingsClient,
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              const taskLogger = taskContext.logger.get('features_identification');
              const settings = await modelSettingsClient.getSettings();
              const connectorId = await resolveConnectorId({
                connectorId: settings.connectorIdKnowledgeIndicatorExtraction,
                uiSettingsClient,
                logger: taskLogger,
              });
              taskLogger.debug(`Using connector ${connectorId} for knowledge indicator extraction`);

              try {
                const [
                  stream,
                  { hits: existingFeatures },
                  { hits: excludedFeatures },
                  { featurePromptOverride },
                ] = await Promise.all([
                  streamsClient.getStream(streamName),
                  featureClient.getFeatures(streamName),
                  featureClient.getExcludedFeatures(streamName),
                  new PromptsConfigService({
                    soClient,
                    logger: taskContext.logger,
                  }).getPrompt(),
                ]);

                telemetryProps.stream_type = getStreamTypeFromDefinition(stream);

                const boundInferenceClient = inferenceClient.bindTo({ connectorId });
                const esClient = scopedClusterClient.asCurrentUser;

                const {
                  documents: sampleDocuments,
                  totalFilters,
                  filtersCapped,
                  hasFilteredDocuments,
                } = await fetchSampleDocuments({
                  esClient,
                  index: stream.name,
                  start,
                  end,
                  features: existingFeatures.filter(isFeatureWithFilter),
                  logger: taskContext.logger,
                });
                telemetryProps.total_filters = totalFilters;
                telemetryProps.filters_capped = filtersCapped;
                telemetryProps.has_filtered_documents = hasFilteredDocuments;

                if (sampleDocuments.length === 0) {
                  taskContext.logger.debug(
                    () =>
                      `No sample documents found for stream ${streamName}, skipping features identification`
                  );
                  return getDeleteTaskRunResult();
                }

                telemetryProps.excluded_features_count = excludedFeatures.length;

                const excludedSummaries: ExcludedFeatureSummary[] = excludedFeatures
                  .slice(0, MAX_EXCLUDED_FEATURES_FOR_PROMPT)
                  .map(({ id, type, subtype, title, description, properties }) => ({
                    id,
                    type,
                    subtype,
                    title,
                    description,
                    properties,
                  }));

                const identifyFeaturesStart = Date.now();
                const [{ features: inferredBaseFeatures, ignoredFeatures }, computedFeatures] =
                  await Promise.all([
                    identifyFeatures({
                      streamName: stream.name,
                      sampleDocuments,
                      excludedFeatures: excludedSummaries,
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

                const { features, newFeaturesCount, codeIgnoredCount } = reconcileFeatures({
                  inferredBaseFeatures,
                  ignoredFeatures,
                  computedFeatures,
                  existingFeatures,
                  excludedFeatures,
                  featureClient,
                  logger: taskLogger,
                  streamName,
                });

                telemetryProps.llm_ignored_count = ignoredFeatures.length;
                telemetryProps.code_ignored_count = codeIgnoredCount;

                await featureClient.bulk(
                  stream.name,
                  features.map((feature) => ({ index: { feature } }))
                );

                await taskClient.complete<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
                  _task,
                  { start, end, streamName },
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
                  : parseError(error).message;

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
                  { start, end, streamName },
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

function reconcileFeatures({
  inferredBaseFeatures,
  ignoredFeatures,
  computedFeatures,
  existingFeatures,
  excludedFeatures,
  featureClient,
  logger,
  streamName,
}: {
  inferredBaseFeatures: BaseFeature[];
  ignoredFeatures: IgnoredFeature[];
  computedFeatures: BaseFeature[];
  existingFeatures: Feature[];
  excludedFeatures: Feature[];
  featureClient: FeatureClient;
  logger: Logger;
  streamName: string;
}): { features: Feature[]; newFeaturesCount: number; codeIgnoredCount: number } {
  // Log all LLM-reported ignored features
  for (const ignored of ignoredFeatures) {
    logger.debug(
      () =>
        `LLM ignored feature "${ignored.feature_id}" (matched excluded "${ignored.excluded_feature_id}"): ${ignored.reason}`
    );
  }

  // Server-side safety net: check against ALL excluded features (not just the subset sent to the LLM)
  let codeIgnoredCount = 0;
  const nonExcludedInferredFeatures = inferredBaseFeatures.filter((feature) => {
    const matchingExcluded = excludedFeatures.find((excluded) =>
      isDuplicateFeature(feature, excluded)
    );
    if (matchingExcluded) {
      codeIgnoredCount++;
      logger.debug(
        () =>
          `Dropping inferred feature [${feature.id}] because it matches excluded feature [${matchingExcluded.id}]`
      );
      return false;
    }
    return true;
  });

  // Combine with computed features
  const identifiedFeatures: BaseFeature[] = [...nonExcludedInferredFeatures, ...computedFeatures];

  // Reconcile with existing features (UUID reuse, dedup tracking)
  let newFeaturesCount = nonExcludedInferredFeatures.length;
  const now = Date.now();
  const features = identifiedFeatures.map((feature) => {
    const existing = featureClient.findDuplicateFeature({
      existingFeatures,
      feature,
    });
    const isComputed = isComputedFeature(feature);
    if (existing && !isComputed) {
      newFeaturesCount--;
      logger.debug(
        () => `Overwriting duplicate feature [${feature.id}] with existing uuid [${existing.uuid}]`
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

  return { features, newFeaturesCount, codeIgnoredCount };
}
