/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, isEqual } from 'lodash';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import {
  isInferenceProviderError,
  type BoundInferenceClient,
  type ChatCompletionTokenCount,
} from '@kbn/inference-common';
import {
  type IdentifyFeaturesResult,
  type BaseFeature,
  type Feature,
  isComputedFeature,
  isDuplicateFeature,
  mergeFeature,
  toBaseFeature,
  getStreamTypeFromDefinition,
} from '@kbn/streams-schema';
import {
  identifyFeatures,
  generateAllComputedFeatures,
  sumTokens,
  type ExcludedFeatureSummary,
  type IgnoredFeature,
} from '@kbn/streams-ai';
import { getDiverseSampleDocuments } from '@kbn/ai-tools/src/tools/describe_dataset/get_diverse_sample_documents';
import { v4 as uuid, v5 as uuidv5 } from 'uuid';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger, LogMeta } from '@kbn/logging';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { formatInferenceProviderError } from '../../../routes/utils/create_connector_sse_error';
import { resolveConnectorId } from '../../../routes/utils/resolve_connector_id';
import type { TaskContext } from '.';
import type { TaskParams } from '../types';
import { PromptsConfigService } from '../../saved_objects/significant_events/prompts_config_service';
import { cancellableTask } from '../cancellable_task';
import { MAX_FEATURE_AGE_MS } from '../../streams/feature/feature_client';
import { isDefinitionNotFoundError } from '../../streams/errors/definition_not_found_error';

const DEFAULT_MAX_ITERATIONS = 5;
const DOCUMENTS_BATCH_SIZE = 20;
const MAX_PREVIOUSLY_IDENTIFIED_FEATURES = 100;
const MAX_EXCLUDED_FEATURES_FOR_PROMPT = 10;

export interface IterationTelemetry {
  iteration: number;
  docsCount: number;
  featuresNew: number;
  featuresUpdated: number;
  durationMs: number;
  tokensUsed: ChatCompletionTokenCount;
  ignoredFeaturesCount: number;
  codeIgnoredCount: number;
}

export interface IdentifyStreamFeaturesOptions {
  streamName: string;
  sampleDocuments: Array<SearchHit<Record<string, unknown>>>;
  existingFeatures: Feature[];
  inferenceClient: BoundInferenceClient;
  systemPrompt: string;
  logger: Logger;
  signal: AbortSignal;
  maxIterations?: number;
  onIterationComplete?: (
    telemetry: IterationTelemetry,
    changedFeatures: Feature[]
  ) => Promise<void>;
  excludedFeatures: Feature[];
}

export async function identifyStreamFeatures({
  streamName,
  sampleDocuments,
  existingFeatures,
  inferenceClient,
  systemPrompt,
  logger,
  signal,
  maxIterations = DEFAULT_MAX_ITERATIONS,
  onIterationComplete,
  excludedFeatures,
}: IdentifyStreamFeaturesOptions): Promise<{
  features: Feature[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  const batches = chunk(sampleDocuments, DOCUMENTS_BATCH_SIZE);
  const effectiveMaxIterations = Math.min(maxIterations, batches.length);

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

  const existingByLowerId = new Map<string, Feature>();
  for (const ef of existingFeatures) {
    existingByLowerId.set(ef.id.toLowerCase(), ef);
  }

  const knownFeatures: Feature[] = [];
  const knownByLowerId = new Map<string, Feature>();
  const knownIdxByUuid = new Map<string, number>();

  let totalTokensUsed: ChatCompletionTokenCount = {
    prompt: 0,
    completion: 0,
    total: 0,
    cached: 0,
  };

  for (let i = 0; i < effectiveMaxIterations; i++) {
    if (signal.aborted) {
      logger.debug('Feature identification aborted');
      throw new Error('Request was aborted');
    }

    const batch = batches[i];
    const previousFeatures = [...knownFeatures]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_PREVIOUSLY_IDENTIFIED_FEATURES);

    logger.debug(
      () =>
        `Iteration ${i + 1}/${effectiveMaxIterations}: processing ${batch.length} documents, ${
          knownFeatures.length
        } features known`
    );

    const iterationStart = Date.now();
    const {
      features: rawFeatures,
      tokensUsed,
      ignoredFeatures,
    } = await identifyFeatures({
      streamName,
      sampleDocuments: batch,
      excludedFeatures: excludedSummaries,
      inferenceClient,
      systemPrompt,
      logger,
      signal,
      previouslyIdentifiedFeatures: previousFeatures.map((f) => ({
        id: f.id,
        type: f.type,
        subtype: f.subtype,
        properties: f.properties,
      })),
    });

    totalTokensUsed = sumTokens(totalTokensUsed, tokensUsed);

    const { newFeatures, updatedFeatures, codeIgnoredCount } = reconcileFeatures({
      rawFeatures,
      knownFeatures,
      knownByLowerId,
      existingFeatures,
      existingByLowerId,
      ignoredFeatures,
      logger,
      excludedFeatures,
    });

    const changedFeatures = [...newFeatures, ...updatedFeatures];

    for (const feature of newFeatures) {
      knownByLowerId.set(feature.id.toLowerCase(), feature);
      knownIdxByUuid.set(feature.uuid, knownFeatures.length);
      knownFeatures.push(feature);
    }
    for (const feature of updatedFeatures) {
      const idx = knownIdxByUuid.get(feature.uuid);
      if (idx !== undefined) {
        knownFeatures[idx] = feature;
        knownByLowerId.set(feature.id.toLowerCase(), feature);
      }
    }

    const iterationEntry: IterationTelemetry = {
      iteration: i + 1,
      docsCount: batch.length,
      featuresNew: newFeatures.length,
      featuresUpdated: updatedFeatures.length,
      durationMs: Date.now() - iterationStart,
      tokensUsed,
      ignoredFeaturesCount: ignoredFeatures.length,
      codeIgnoredCount,
    };
    await onIterationComplete?.(iterationEntry, changedFeatures);

    logger.debug(
      () =>
        `Iteration ${i + 1}: found ${rawFeatures.length} features ` +
        `(${newFeatures.length} new, ${updatedFeatures.length} updated), ${knownFeatures.length} total known, ` +
        `tokens: prompt=${tokensUsed.prompt} completion=${tokensUsed.completion} cached=${
          tokensUsed.cached ?? 0
        }`
    );

    if (newFeatures.length === 0) {
      logger.debug('Stopping: no new features found');
      break;
    }
  }

  return {
    features: knownFeatures,
    tokensUsed: totalTokensUsed,
  };
}

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

              const { start, end, streamName, _task } = runContext.taskInstance
                .params as TaskParams<FeaturesIdentificationTaskParams>;

              const runId = uuid();
              const trackEmptyTelemetry = (state: 'canceled' | 'failure') => {
                taskContext.telemetry.trackFeaturesIdentified({
                  run_id: runId,
                  iteration: 0,
                  stream_name: streamName,
                  stream_type: 'unknown',
                  state,
                  docs_count: 0,
                  features_new: 0,
                  features_updated: 0,
                  input_tokens_used: 0,
                  output_tokens_used: 0,
                  total_tokens_used: 0,
                  cached_tokens_used: 0,
                  duration_ms: 0,
                  excluded_features_count: 0,
                  llm_ignored_count: 0,
                  code_ignored_count: 0,
                });
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
                const [stream, { featurePromptOverride }] = await Promise.all([
                  streamsClient.getStream(streamName),
                  new PromptsConfigService({
                    soClient,
                    logger: taskContext.logger,
                  }).getPrompt(),
                ]);

                const streamType = getStreamTypeFromDefinition(stream);
                const boundInferenceClient = inferenceClient.bindTo({ connectorId });
                const esClient = scopedClusterClient.asCurrentUser;

                const [
                  { hits: sampleDocuments },
                  { hits: allExistingFeatures },
                  { hits: excludedFeatures },
                ] = await Promise.all([
                  getDiverseSampleDocuments({
                    esClient,
                    index: stream.name,
                    start,
                    end,
                    size: 100,
                  }),
                  featureClient.getFeatures(stream.name),
                  featureClient.getExcludedFeatures(stream.name),
                ]);

                if (sampleDocuments.length === 0) {
                  taskContext.logger.debug(
                    () =>
                      `No sample documents found for stream ${streamName}, skipping features identification`
                  );
                  return getDeleteTaskRunResult();
                }

                const existingFeatures = allExistingFeatures.filter((f) => !isComputedFeature(f));

                const [{ features: inferredFeatures }, computedFeatures] = await Promise.all([
                  identifyStreamFeatures({
                    streamName: stream.name,
                    sampleDocuments,
                    existingFeatures,
                    excludedFeatures,
                    inferenceClient: boundInferenceClient,
                    logger: taskContext.logger.get('features_identification'),
                    signal: runContext.abortController.signal,
                    systemPrompt: featurePromptOverride,
                    onIterationComplete: async (it, changedFeatures) => {
                      if (changedFeatures.length > 0) {
                        await featureClient.bulk(
                          stream.name,
                          changedFeatures.map((feature) => ({ index: { feature } }))
                        );
                      }
                      taskContext.telemetry.trackFeaturesIdentified({
                        run_id: runId,
                        iteration: it.iteration,
                        stream_name: streamName,
                        stream_type: streamType,
                        state: 'success',
                        docs_count: it.docsCount,
                        features_new: it.featuresNew,
                        features_updated: it.featuresUpdated,
                        input_tokens_used: it.tokensUsed.prompt,
                        output_tokens_used: it.tokensUsed.completion,
                        total_tokens_used: it.tokensUsed.total,
                        cached_tokens_used: it.tokensUsed.cached ?? 0,
                        duration_ms: it.durationMs,
                        excluded_features_count: excludedFeatures.length,
                        llm_ignored_count: it.ignoredFeaturesCount,
                        code_ignored_count: it.codeIgnoredCount,
                      });
                    },
                  }),
                  generateAllComputedFeatures({
                    stream,
                    start,
                    end,
                    esClient,
                    logger: taskContext.logger.get('computed_features'),
                  }),
                ]);

                const reconciledComputedFeatures = reconcileComputedFeatures({
                  computedFeatures,
                  streamName,
                });

                if (reconciledComputedFeatures.length > 0) {
                  await featureClient.bulk(
                    stream.name,
                    reconciledComputedFeatures.map((feature) => ({ index: { feature } }))
                  );
                }

                const allFeatures = [...inferredFeatures, ...reconciledComputedFeatures];

                await taskClient.complete<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
                  _task,
                  { start, end, streamName },
                  { features: allFeatures }
                );
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
                  trackEmptyTelemetry('canceled');
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

                trackEmptyTelemetry('failure');

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

function createFeatureMetadata() {
  const now = Date.now();
  return {
    status: 'active' as const,
    last_seen: new Date(now).toISOString(),
    expires_at: new Date(now + MAX_FEATURE_AGE_MS).toISOString(),
  };
}

function reconcileFeatures({
  rawFeatures,
  knownFeatures,
  ignoredFeatures,
  knownByLowerId,
  existingFeatures,
  excludedFeatures,
  existingByLowerId,
  logger,
}: {
  rawFeatures: BaseFeature[];
  knownFeatures: Feature[];
  ignoredFeatures: IgnoredFeature[];
  knownByLowerId: Map<string, Feature>;
  existingFeatures: Feature[];
  excludedFeatures: Feature[];
  existingByLowerId: Map<string, Feature>;
  logger: Logger;
}): { newFeatures: Feature[]; updatedFeatures: Feature[]; codeIgnoredCount: number } {
  const newFeatures: Feature[] = [];
  const updatedFeatures: Feature[] = [];
  const metadata = createFeatureMetadata();
  // Log all LLM-reported ignored features
  for (const ignored of ignoredFeatures) {
    logger.debug(
      () =>
        `LLM ignored feature "${ignored.feature_id}" (matched excluded "${ignored.excluded_feature_id}"): ${ignored.reason}`
    );
  }

  // Server-side safety net: check against ALL excluded features (not just the subset sent to the LLM)
  let codeIgnoredCount = 0;
  const nonExcludedInferredFeatures = rawFeatures.filter((feature) => {
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

  for (const raw of nonExcludedInferredFeatures) {
    // 1. Intra-run match: merge features between iterations of this run
    const thisRunMatch =
      knownByLowerId.get(raw.id.toLowerCase()) ??
      knownFeatures.find((kf) => isDuplicateFeature(kf, raw));

    if (thisRunMatch) {
      const merged = mergeFeature(thisRunMatch, raw);
      if (!isEqual(merged, toBaseFeature(thisRunMatch))) {
        updatedFeatures.push({ ...merged, ...metadata, uuid: thisRunMatch.uuid });
      }
    } else {
      // 2. Cross-run match: check against features from prior runs
      const existingMatch =
        existingByLowerId.get(raw.id.toLowerCase()) ??
        existingFeatures.find((ef) => isDuplicateFeature(ef, raw));

      if (existingMatch) {
        // Re-discovered: new version + existing UUID + fresh metadata
        newFeatures.push({ ...raw, ...metadata, uuid: existingMatch.uuid });
      } else {
        // Truly new feature
        newFeatures.push({ ...raw, ...metadata, uuid: uuid() });
      }
    }
  }

  return { newFeatures, updatedFeatures, codeIgnoredCount };
}

function reconcileComputedFeatures({
  computedFeatures,
  streamName,
}: {
  computedFeatures: BaseFeature[];
  streamName: string;
}): Feature[] {
  const metadata = createFeatureMetadata();
  return computedFeatures.map((feature) => ({
    ...feature,
    ...metadata,
    uuid: uuidv5(`${streamName}:${feature.id}`, uuidv5.DNS),
  }));
}
