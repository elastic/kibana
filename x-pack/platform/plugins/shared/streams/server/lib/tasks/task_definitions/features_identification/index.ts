/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
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
  isFeatureWithFilter,
} from '@kbn/streams-schema';
import {
  identifyFeatures,
  generateAllComputedFeatures,
  sumTokens,
  type ExcludedFeatureSummary,
  type IgnoredFeature,
} from '@kbn/streams-ai';
import { v4 as uuid, v5 as uuidv5 } from 'uuid';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger, LogMeta } from '@kbn/logging';
import { parseError } from '../../../streams/errors/parse_error';
import { fetchSampleDocuments } from './fetch_sample_documents';
import { formatInferenceProviderError } from '../../../../routes/utils/create_connector_sse_error';
import { resolveConnectorId } from '../../../../routes/utils/resolve_connector_id';
import type { TaskContext } from '..';
import type { TaskParams } from '../../types';
import { PromptsConfigService } from '../../../sig_events/saved_objects/prompts_config_service';
import { cancellableTask } from '../../cancellable_task';
import { MAX_FEATURE_AGE_MS } from '../../../streams/feature/feature_client';
import { isDefinitionNotFoundError } from '../../../streams/errors/definition_not_found_error';

const DEFAULT_MAX_ITERATIONS = 5;
const DOCUMENTS_BATCH_SIZE = 20;
const MAX_PREVIOUSLY_IDENTIFIED_FEATURES = 100;
const MAX_EXCLUDED_FEATURES_FOR_PROMPT = 10;

class FeatureAccumulator {
  private readonly byUuid = new Map<string, Feature>();
  private readonly byLowerId = new Map<string, Feature>();

  constructor(initialFeatures: Feature[] = []) {
    for (const f of initialFeatures) {
      this.add(f);
    }
  }

  add(feature: Feature) {
    this.byUuid.set(feature.uuid, feature);
    this.byLowerId.set(feature.id.toLowerCase(), feature);
  }

  update(feature: Feature) {
    if (!this.byUuid.has(feature.uuid)) {
      return;
    }
    this.byUuid.set(feature.uuid, feature);
    this.byLowerId.set(feature.id.toLowerCase(), feature);
  }

  findDuplicate(candidate: BaseFeature): Feature | undefined {
    return (
      this.byLowerId.get(candidate.id.toLowerCase()) ??
      this.getAll().find((f) => isDuplicateFeature(f, candidate))
    );
  }

  getAll(): Feature[] {
    return Array.from(this.byUuid.values());
  }

  getTopByConfidence(limit: number): Feature[] {
    return this.getAll()
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  public get length(): number {
    return this.byUuid.size;
  }
}

export interface IterationTelemetry {
  iteration: number;
  state: 'success' | 'failure';
  docsCount: number;
  featuresNew: number;
  featuresUpdated: number;
  durationMs: number;
  tokensUsed: ChatCompletionTokenCount;
  ignoredFeaturesCount: number;
  codeIgnoredCount: number;
  totalFilters: number;
  filtersCapped: boolean;
  hasFilteredDocuments: boolean;
}

export interface IdentifyStreamFeaturesOptions {
  streamName: string;
  esClient: ElasticsearchClient;
  start: number;
  end: number;
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
  esClient,
  start,
  end,
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

  const known = new FeatureAccumulator();
  const existing = new FeatureAccumulator(existingFeatures);

  let totalTokensUsed: ChatCompletionTokenCount = {
    prompt: 0,
    completion: 0,
    total: 0,
    cached: 0,
  };

  for (let i = 0; i < maxIterations; i++) {
    if (signal.aborted) {
      logger.debug('Feature identification aborted');
      throw new Error('Request was aborted');
    }

    const batchResult = await fetchSampleDocuments({
      esClient,
      index: streamName,
      start,
      end,
      features: known.getAll().filter(isFeatureWithFilter),
      logger,
      size: DOCUMENTS_BATCH_SIZE,
    });

    if (batchResult.documents.length === 0) {
      logger.debug('Stopping: no documents available for sampling');
      break;
    }

    const previousFeatures = known.getTopByConfidence(MAX_PREVIOUSLY_IDENTIFIED_FEATURES);

    logger.debug(
      () =>
        `Iteration ${i + 1}/${maxIterations}: processing ${
          batchResult.documents.length
        } documents, ${known.length} features known`
    );

    const iterationStart = Date.now();
    let rawFeatures: BaseFeature[];
    let tokensUsed: ChatCompletionTokenCount;
    let ignoredFeatures: IgnoredFeature[];

    try {
      ({
        features: rawFeatures,
        tokensUsed,
        ignoredFeatures,
      } = await identifyFeatures({
        streamName,
        sampleDocuments: batchResult.documents,
        excludedFeatures: excludedSummaries,
        inferenceClient,
        systemPrompt,
        logger,
        signal,
        previouslyIdentifiedFeatures: previousFeatures.map((f) => ({
          id: f.id,
          type: f.type,
          subtype: f.subtype,
          title: f.title,
          description: f.description,
          properties: f.properties,
        })),
      }));
    } catch (error) {
      const emptyTokens: ChatCompletionTokenCount = {
        prompt: 0,
        completion: 0,
        total: 0,
        cached: 0,
      };
      await onIterationComplete?.(
        {
          iteration: i + 1,
          state: 'failure',
          docsCount: batchResult.documents.length,
          featuresNew: 0,
          featuresUpdated: 0,
          durationMs: Date.now() - iterationStart,
          tokensUsed: emptyTokens,
          ignoredFeaturesCount: 0,
          codeIgnoredCount: 0,
          totalFilters: batchResult.totalFilters,
          filtersCapped: batchResult.filtersCapped,
          hasFilteredDocuments: batchResult.hasFilteredDocuments,
        },
        []
      );
      throw error;
    }

    totalTokensUsed = sumTokens(totalTokensUsed, tokensUsed);

    const { newFeatures, updatedFeatures, codeIgnoredCount } = reconcileFeatures({
      rawFeatures,
      known,
      existing,
      ignoredFeatures,
      logger,
      excludedFeatures,
    });

    const changedFeatures = [...newFeatures, ...updatedFeatures];

    for (const feature of newFeatures) {
      known.add(feature);
    }
    for (const feature of updatedFeatures) {
      known.update(feature);
    }

    const iterationEntry: IterationTelemetry = {
      iteration: i + 1,
      state: 'success',
      docsCount: batchResult.documents.length,
      featuresNew: newFeatures.length,
      featuresUpdated: updatedFeatures.length,
      durationMs: Date.now() - iterationStart,
      tokensUsed,
      ignoredFeaturesCount: ignoredFeatures.length,
      codeIgnoredCount,
      totalFilters: batchResult.totalFilters,
      filtersCapped: batchResult.filtersCapped,
      hasFilteredDocuments: batchResult.hasFilteredDocuments,
    };
    await onIterationComplete?.(iterationEntry, changedFeatures);

    logger.debug(
      () =>
        `Iteration ${i + 1}: found ${rawFeatures.length} features ` +
        `(${newFeatures.length} new, ${updatedFeatures.length} updated), ${known.length} total known, ` +
        `tokens: prompt=${tokensUsed.prompt} completion=${tokensUsed.completion} cached=${
          tokensUsed.cached ?? 0
        }`
    );
  }

  return {
    features: known.getAll(),
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
                  total_filters: 0,
                  filters_capped: false,
                  has_filtered_documents: false,
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

              const taskLogger = taskContext.logger.get('features_identification', streamName);
              const settings = await modelSettingsClient.getSettings();
              const connectorId = await resolveConnectorId({
                connectorId: settings.connectorIdKnowledgeIndicatorExtraction,
                uiSettingsClient,
                logger: taskLogger,
              });
              taskLogger.debug(`Using connector ${connectorId} for knowledge indicator extraction`);

              let hasTrackedIteration = false;
              try {
                const [
                  stream,
                  { hits: allExistingFeatures },
                  { hits: excludedFeatures },
                  { featurePromptOverride },
                ] = await Promise.all([
                  streamsClient.getStream(streamName),
                  featureClient.getFeatures(streamName),
                  featureClient.getExcludedFeatures(streamName),
                  new PromptsConfigService({
                    soClient,
                    logger: taskLogger,
                  }).getPrompt(),
                ]);

                const streamType = getStreamTypeFromDefinition(stream);
                const boundInferenceClient = inferenceClient.bindTo({ connectorId });
                const esClient = scopedClusterClient.asCurrentUser;

                const existingFeatures = allExistingFeatures.filter((f) => !isComputedFeature(f));

                const [{ features: inferredFeatures }, computedFeatures] = await Promise.all([
                  identifyStreamFeatures({
                    streamName: stream.name,
                    esClient,
                    start,
                    end,
                    existingFeatures,
                    excludedFeatures,
                    inferenceClient: boundInferenceClient,
                    logger: taskLogger,
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
                        state: it.state,
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
                        total_filters: it.totalFilters,
                        filters_capped: it.filtersCapped,
                        has_filtered_documents: it.hasFilteredDocuments,
                      });
                      hasTrackedIteration = true;
                    },
                  }),
                  generateAllComputedFeatures({
                    stream,
                    start,
                    end,
                    esClient,
                    logger: taskContext.logger.get('computed_features', streamName),
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
                  taskLogger.debug(
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
                  taskLogger.debug(
                    () => `Task ${runContext.taskInstance.id} was canceled: ${errorMessage}`
                  );
                  trackEmptyTelemetry('canceled');
                  return getDeleteTaskRunResult();
                }

                taskLogger.error(`Task ${runContext.taskInstance.id} failed: ${errorMessage}`, {
                  error,
                } as LogMeta);

                await taskClient.fail<FeaturesIdentificationTaskParams>(
                  _task,
                  { start, end, streamName },
                  errorMessage
                );

                if (!hasTrackedIteration) {
                  trackEmptyTelemetry('failure');
                }

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

/** Compares only domain fields (ignores uuid, status, timestamps) */
const hasChanged = (updated: BaseFeature, current: Feature): boolean =>
  !isEqual(updated, toBaseFeature(current));

function reconcileFeatures({
  rawFeatures,
  known,
  existing,
  ignoredFeatures,
  excludedFeatures,
  logger,
}: {
  rawFeatures: BaseFeature[];
  known: FeatureAccumulator;
  existing: FeatureAccumulator;
  ignoredFeatures: IgnoredFeature[];
  excludedFeatures: Feature[];
  logger: Logger;
}): { newFeatures: Feature[]; updatedFeatures: Feature[]; codeIgnoredCount: number } {
  const newFeatures: Feature[] = [];
  const updatedFeatures: Feature[] = [];
  const metadata = createFeatureMetadata();

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
    const thisRunMatch = known.findDuplicate(raw);

    if (thisRunMatch) {
      // Intra-run: merge evidence/tags accumulated across iterations of this run
      const merged = mergeFeature(thisRunMatch, raw);
      if (hasChanged(merged, thisRunMatch)) {
        updatedFeatures.push({ ...merged, ...metadata, uuid: thisRunMatch.uuid });
      }
    } else {
      // Cross-run: reuse UUID for UI continuity but don't merge — prior data may be stale
      const existingMatch = existing.findDuplicate(raw);

      if (existingMatch) {
        newFeatures.push({ ...raw, ...metadata, uuid: existingMatch.uuid });
      } else {
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
