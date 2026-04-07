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
  type IterationResult,
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
import { STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID } from '@kbn/streams-schema';
import { parseError } from '../../../streams/errors/parse_error';
import { fetchSampleDocuments } from './fetch_sample_documents';
import { formatInferenceProviderError } from '../../../../routes/utils/create_connector_sse_error';
import { resolveConnectorForFeature } from '../../../../routes/utils/resolve_connector_for_feature';
import type { TaskContext } from '..';
import type { TaskParams } from '../../types';
import { PromptsConfigService } from '../../../sig_events/saved_objects/prompts_config_service';
import { cancellableTask } from '../../cancellable_task';
import { MAX_FEATURE_AGE_MS } from '../../../streams/feature/feature_client';
import { isDefinitionNotFoundError } from '../../../streams/errors/definition_not_found_error';

const toFeatureSummary = ({ id, title }: Feature) => ({ id, title: title ?? id });

const DEFAULT_MAX_ITERATIONS = 5;
const DOCUMENTS_BATCH_SIZE = 20;
const EMPTY_TOKENS: ChatCompletionTokenCount = { prompt: 0, completion: 0, total: 0, cached: 0 };
const MAX_PREVIOUSLY_IDENTIFIED_FEATURES = 100;
const MAX_EXCLUDED_FEATURES_FOR_PROMPT = 10;

class FeatureAccumulator {
  private readonly byUuid = new Map<string, Feature>();
  private readonly byLowerId = new Map<string, Feature>();
  private readonly fromStorage = new Set<string>();

  constructor(initialFeatures: Feature[] = []) {
    for (const f of initialFeatures) {
      this.add(f);
      this.fromStorage.add(f.uuid);
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

  isStoredFeature(feature: Feature): boolean {
    return this.fromStorage.has(feature.uuid);
  }

  promoteFromStorage(featureUuid: string) {
    this.fromStorage.delete(featureUuid);
  }

  getAll(): Feature[] {
    return Array.from(this.byUuid.values());
  }

  getDiscovered(): Feature[] {
    return this.getAll().filter((f) => !this.fromStorage.has(f.uuid));
  }

  getTopRanked(limit: number): Feature[] {
    return this.getAll()
      .sort((a, b) => {
        const aEntity = a.type === 'entity' ? 0 : 1;
        const bEntity = b.type === 'entity' ? 0 : 1;
        if (aEntity !== bEntity) return aEntity - bEntity;
        return b.confidence - a.confidence;
      })
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
    changes: { newFeatures: Feature[]; updatedFeatures: Feature[] }
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

  const known = new FeatureAccumulator(existingFeatures);

  let totalTokensUsed: ChatCompletionTokenCount = { ...EMPTY_TOKENS };

  let successCount = 0;
  let failureCount = 0;

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
      features: known.getDiscovered().filter(isFeatureWithFilter),
      logger,
      size: DOCUMENTS_BATCH_SIZE,
    });

    if (batchResult.documents.length === 0) {
      logger.debug('Stopping: no documents available for sampling');
      break;
    }

    const previousFeatures = known.getTopRanked(MAX_PREVIOUSLY_IDENTIFIED_FEATURES);

    logger.debug(
      () =>
        `Iteration ${i + 1}/${maxIterations}: processing ${
          batchResult.documents.length
        } documents, ${known.length} features known`
    );

    const iterationStart = Date.now();

    const identifyFeaturesArgs = {
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
    };

    const emitFailedIteration = (sinceMs: number) =>
      onIterationComplete?.(
        {
          iteration: i + 1,
          state: 'failure',
          docsCount: batchResult.documents.length,
          featuresNew: 0,
          featuresUpdated: 0,
          durationMs: Date.now() - sinceMs,
          tokensUsed: EMPTY_TOKENS,
          ignoredFeaturesCount: 0,
          codeIgnoredCount: 0,
          totalFilters: batchResult.totalFilters,
          filtersCapped: batchResult.filtersCapped,
          hasFilteredDocuments: batchResult.hasFilteredDocuments,
        },
        { newFeatures: [], updatedFeatures: [] }
      );

    let result: Awaited<ReturnType<typeof identifyFeatures>>;
    try {
      result = await identifyFeatures(identifyFeaturesArgs);
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Iteration ${i + 1} failed (${errorMsg}), continuing`);
      failureCount++;
      await emitFailedIteration(iterationStart);
      continue;
    }

    successCount++;

    const { features: rawFeatures, tokensUsed, ignoredFeatures } = result;

    totalTokensUsed = sumTokens(totalTokensUsed, tokensUsed);

    const { newFeatures, updatedFeatures, codeIgnoredCount } = reconcileFeatures({
      rawFeatures,
      known,
      ignoredFeatures,
      logger,
      excludedFeatures,
    });

    for (const feature of newFeatures) {
      known.add(feature);
    }
    for (const feature of updatedFeatures) {
      known.update(feature);
      if (known.isStoredFeature(feature)) {
        known.promoteFromStorage(feature.uuid);
      }
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

    await onIterationComplete?.(iterationEntry, { newFeatures, updatedFeatures });

    logger.debug(
      () =>
        `Iteration ${i + 1}: found ${rawFeatures.length} features ` +
        `(${newFeatures.length} new, ${updatedFeatures.length} updated), ${known.length} total known, ` +
        `tokens: prompt=${tokensUsed.prompt} completion=${tokensUsed.completion} cached=${
          tokensUsed.cached ?? 0
        }`
    );
  }

  if (failureCount > 0 && successCount === 0) {
    throw new Error(`All iterations failed for stream ${streamName}`);
  }

  return {
    features: known.getDiscovered(),
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
              const { fakeRequest } = runContext;

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
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              const taskLogger = taskContext.logger.get('features_identification', streamName);
              const connectorId = await resolveConnectorForFeature({
                searchInferenceEndpoints: taskContext.server.searchInferenceEndpoints,
                featureId: STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
                featureName: 'knowledge indicator extraction',
                request: fakeRequest,
              });
              taskLogger.debug(`Using connector ${connectorId} for knowledge indicator extraction`);

              let hasTrackedIteration = false;
              const iterationResults: IterationResult[] = [];
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

                const [
                  { features: inferredFeatures, tokensUsed: totalTokensUsed },
                  computedFeatures,
                ] = await Promise.all([
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
                    onIterationComplete: async (it, changes) => {
                      const allChanged = [...changes.newFeatures, ...changes.updatedFeatures];
                      if (allChanged.length > 0) {
                        await featureClient.bulk(
                          stream.name,
                          allChanged.map((feature) => ({ index: { feature } }))
                        );
                      }
                      iterationResults.push({
                        iteration: it.iteration,
                        durationMs: it.durationMs,
                        state: it.state,
                        tokensUsed: it.tokensUsed,
                        newFeatures: changes.newFeatures.map(toFeatureSummary),
                        updatedFeatures: changes.updatedFeatures.map(toFeatureSummary),
                      });
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

                const durationMs = Date.now() - new Date(_task.created_at).getTime();

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
                  {
                    features: allFeatures,
                    durationMs,
                    iterations: iterationResults,
                    totalTokensUsed,
                  }
                );
              } catch (error) {
                const failDurationMs = Date.now() - new Date(_task.created_at).getTime();

                if (isDefinitionNotFoundError(error)) {
                  taskLogger.debug(
                    () =>
                      `Stream ${streamName} was deleted before features identification task started, skipping`
                  );
                  return getDeleteTaskRunResult();
                }

                let connector;
                try {
                  connector = await inferenceClient.getConnectorById(connectorId);
                } catch (connectorErr) {
                  taskLogger.warn(
                    `Failed to fetch connector ${connectorId} for error enrichment: ${
                      connectorErr instanceof Error ? connectorErr.message : String(connectorErr)
                    }`
                  );
                }

                const errorMessage =
                  isInferenceProviderError(error) && connector
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

                const partialTokensUsed = iterationResults.reduce(
                  (acc, iter) => sumTokens(acc, iter.tokensUsed),
                  { ...EMPTY_TOKENS }
                );

                await taskClient.fail<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
                  _task,
                  { start, end, streamName },
                  errorMessage,
                  {
                    features: [],
                    durationMs: failDurationMs,
                    iterations: iterationResults,
                    totalTokensUsed: partialTokensUsed,
                  }
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
  ignoredFeatures,
  excludedFeatures,
  logger,
}: {
  rawFeatures: BaseFeature[];
  known: FeatureAccumulator;
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
    const match = known.findDuplicate(raw);

    if (match) {
      if (known.isStoredFeature(match)) {
        // Stored-origin: always update to refresh last_seen / expires_at
        updatedFeatures.push({ ...raw, ...metadata, uuid: match.uuid });
      } else {
        // Intra-run: merge properties accumulated across iterations of this run
        const merged = mergeFeature(match, raw);
        if (hasChanged(merged, match)) {
          updatedFeatures.push({ ...merged, ...metadata, uuid: match.uuid });
        }
      }
    } else {
      newFeatures.push({ ...raw, ...metadata, uuid: uuid() });
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
