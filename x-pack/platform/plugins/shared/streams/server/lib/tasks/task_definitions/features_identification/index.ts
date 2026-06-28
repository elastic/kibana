/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @deprecated Features identification is now handled via the onboarding workflow (streams_ki/onboarding.yaml).
 * This task definition is kept for reference and will be removed in a follow-up.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError, type InferenceConnector } from '@kbn/inference-common';
import {
  type IdentifyFeaturesResult,
  type IterationResult,
  type FeatureUpsert,
  getStreamTypeFromDefinition,
} from '@kbn/streams-schema';
import { v4 as uuid } from 'uuid';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger, LogMeta } from '@kbn/logging';
import { STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID } from '@kbn/streams-schema';
import { parseError } from '../../../streams/errors/parse_error';
import { formatInferenceProviderError } from '../../../../routes/utils/create_connector_sse_error';
import { resolveConnectorForFeature } from '../../../../routes/utils/resolve_connector_for_feature';
import type { TaskContext } from '..';
import type { TaskParams } from '../../types';
import { cancellableTask } from '../../cancellable_task';
import { isDefinitionNotFoundError } from '../../../streams/errors/definition_not_found_error';
import {
  buildTelemetry,
  deriveSuccessCount,
  deriveTotalTokensUsed,
  identifyInferredFeatures,
  identifyComputedFeatures,
} from '../../../sig_events/features';
import { isSignificantEventsSemanticCodeSearchGroundingEnabled } from '../../../semantic_code_search_grounding/is_significant_events_semantic_code_search_grounding_enabled';

export interface FeaturesIdentificationTaskParams {
  start: number;
  end: number;
  streamName: string;
  connectorId?: string;
}

export const FEATURES_IDENTIFICATION_TASK_TYPE = 'streams_features_identification';

export function getFeaturesIdentificationTaskId(streamName: string) {
  return `${FEATURES_IDENTIFICATION_TASK_TYPE}_${streamName}`;
}

<<<<<<< HEAD
function isCancellationError(message: string): boolean {
  return message.includes('ERR_CANCELED') || message.includes('Request was aborted');
=======
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

              const {
                start,
                end,
                streamName,
                connectorId: connectorIdOverride,
                _task,
              } = runContext.taskInstance.params as TaskParams<FeaturesIdentificationTaskParams>;

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
                getFeatureClient,
                streamsClient,
                inferenceClient,
                soClient,
              } = await taskContext.getScopedClients({
                request: runContext.fakeRequest,
              });

              const featureClient = await getFeatureClient();

              const taskLogger = taskContext.logger.get('features_identification', streamName);
              const connectorId =
                connectorIdOverride ??
                (await resolveConnectorForFeature({
                  searchInferenceEndpoints: taskContext.server.searchInferenceEndpoints,
                  featureId: STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
                  featureName: 'knowledge indicator extraction',
                  request: fakeRequest,
                }));
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
                  { start, end, streamName, connectorId: connectorIdOverride },
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
                  { start, end, streamName, connectorId: connectorIdOverride },
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
>>>>>>> 9.4
}

function buildTaskResult(iterationResults: IterationResult[], durationMs: number) {
  return {
    durationMs,
    iterations: iterationResults,
    totalTokensUsed: deriveTotalTokensUsed(iterationResults),
  };
}

async function runFeaturesIdentification(
  taskContext: TaskContext,
  runContext: Parameters<typeof cancellableTask>[1]
) {
  if (!runContext.fakeRequest) {
    throw new Error('Request is required to run this task');
  }
  const { fakeRequest } = runContext;

  const {
    start,
    end,
    streamName,
    connectorId: connectorIdOverride,
    _task,
  } = runContext.taskInstance.params as TaskParams<FeaturesIdentificationTaskParams>;
  const taskParams = { start, end, streamName, connectorId: connectorIdOverride };

  const taskDurationMs = () => Date.now() - new Date(_task.created_at).getTime();

  const runId = uuid();

  const {
    taskClient,
    scopedClusterClient,
    getKnowledgeIndicatorClient,
    streamsClient,
    inferenceClient,
    soClient,
    tuningConfig,
  } = await taskContext.getScopedClients({ request: fakeRequest });

  const taskLogger = taskContext.logger.get('features_identification', streamName);

  const [kiClient, connectorId] = await Promise.all([
    getKnowledgeIndicatorClient(),
    connectorIdOverride
      ? Promise.resolve(connectorIdOverride)
      : resolveConnectorForFeature({
          searchInferenceEndpoints: taskContext.server.searchInferenceEndpoints,
          featureId: STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
          featureName: 'knowledge indicator extraction',
          request: fakeRequest,
        }),
  ]);
  taskLogger.debug(`Using connector ${connectorId} for knowledge indicator extraction`);

  const emptyTelemetryCtx = {
    run_id: runId,
    connector_id: connectorId,
    iteration: 0,
    stream_name: streamName,
    stream_type: 'unknown' as const,
    docs_count: 0,
    excluded_features_count: 0,
    total_filters: 0,
    filters_capped: false,
    has_filtered_documents: false,
  };
  const trackEmptyTelemetry = (telemetryState: 'canceled' | 'failure') => {
    taskContext.telemetry.trackFeaturesIdentified(
      buildTelemetry(emptyTelemetryCtx, 0, { state: telemetryState })
    );
  };

  let hasTrackedIteration = false;
  const iterationResults: IterationResult[] = [];
  let discoveredFeatures: FeatureUpsert[] = [];

  try {
    const stream = await streamsClient.getStream(streamName);

    const streamType = getStreamTypeFromDefinition(stream);
    const boundInferenceClient = inferenceClient.bindTo({ connectorId });
    const esClient = scopedClusterClient.asCurrentUser;

    const trackFeaturesIdentified = (
      data: Parameters<typeof taskContext.telemetry.trackFeaturesIdentified>[0]
    ) => {
      hasTrackedIteration = true;
      taskContext.telemetry.trackFeaturesIdentified(data);
    };

    const { max_iterations: maxIterations } = tuningConfig;
    let tuning = {
      sample_size: tuningConfig.sample_size,
      entity_filtered_ratio: tuningConfig.entity_filtered_ratio,
      diverse_ratio: tuningConfig.diverse_ratio,
      max_excluded_features_in_prompt: tuningConfig.max_excluded_features_in_prompt,
      max_entity_filters: tuningConfig.max_entity_filters,
    };

    // NOTE: attach `.catch` eagerly here (not at the later `await`) so this
    // floating promise can never become an unhandled rejection if the
    // inferred-features loop below throws before we reach the `await`. An
    // unhandled rejection on this promise (e.g. `index_not_found_exception`
    // when a wired stream has no backing data stream yet) crashes Kibana.
    const codeGroundingEnabled =
      Boolean(taskContext.server.agentBuilder?.tools) &&
      (await isSignificantEventsSemanticCodeSearchGroundingEnabled(
        taskContext.server.core.featureFlags
      ));

    const computedFeaturesPromise = identifyComputedFeatures({
      stream,
      streamName: stream.name,
      start,
      end,
      esClient,
      kiClient,
      logger: taskLogger,
      runId,
      ...(codeGroundingEnabled
        ? {
            agentBuilderTools: taskContext.server.agentBuilder?.tools,
            request: fakeRequest,
            telemetry: taskContext.telemetry,
          }
        : {}),
    }).catch((err) => {
      // Computed features generation is not expected to fail; surface it as
      // an error so it's actionable, but swallow the rejection so it cannot
      // become an unhandled rejection and crash Kibana.
      taskLogger.error(`Computed features generation failed: ${parseError(err).message}`, {
        error: err,
      } as LogMeta);
      return [] as Awaited<ReturnType<typeof identifyComputedFeatures>>;
    });

    let diverseOffset = 0;

    for (let i = 0; i < maxIterations; i++) {
      if (runContext.abortController.signal.aborted) {
        taskLogger.debug('Feature identification aborted');
        throw new Error('Request was aborted');
      }

      taskLogger.debug(
        () =>
          `Iteration ${i + 1}/${maxIterations}: ` +
          `${discoveredFeatures.length} features known, starting iteration`
      );

      const result = await identifyInferredFeatures({
        esClient,
        kiClient,
        soClient,
        inferenceClient: boundInferenceClient,
        connectorId,
        logger: taskLogger,
        signal: runContext.abortController.signal,
        streamName: stream.name,
        streamType,
        start,
        end,
        runId,
        iteration: i + 1,
        tuning,
        diverseOffset,
        trackFeaturesIdentified,
      });

      if (!result.hasDocuments) {
        taskLogger.debug('Stopping: no documents available for sampling');
        break;
      }

      if (result.nextDiverseOffset === diverseOffset) {
        tuning = { ...tuning, diverse_ratio: 0 };
      }
      diverseOffset = result.nextDiverseOffset;

      iterationResults.push(result.iterationResult);
      discoveredFeatures = result.discoveredFeatures;
    }

    if (iterationResults.length > 0 && deriveSuccessCount(iterationResults) === 0) {
      throw new Error(`All iterations failed for stream ${streamName}`);
    }

    const reconciledComputedFeatures = await computedFeaturesPromise;
    const allFeatures = [...discoveredFeatures, ...reconciledComputedFeatures];

    await taskClient.complete<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
      _task,
      taskParams,
      { ...buildTaskResult(iterationResults, taskDurationMs()), features: allFeatures }
    );
  } catch (error) {
    if (isDefinitionNotFoundError(error)) {
      taskLogger.debug(
        () =>
          `Stream ${streamName} was deleted before features identification task started, skipping`
      );
      return getDeleteTaskRunResult();
    }

    const errorMessage = await resolveErrorMessage(error, inferenceClient, connectorId, taskLogger);

    if (isCancellationError(errorMessage)) {
      taskLogger.debug(() => `Task ${runContext.taskInstance.id} was canceled: ${errorMessage}`);
      trackEmptyTelemetry('canceled');
      return getDeleteTaskRunResult();
    }

    taskLogger.error(`Task ${runContext.taskInstance.id} failed: ${errorMessage}`, {
      error,
    } as LogMeta);

    await taskClient.fail<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
      _task,
      taskParams,
      errorMessage,
      { ...buildTaskResult(iterationResults, taskDurationMs()), features: [] }
    );

    if (!hasTrackedIteration) {
      trackEmptyTelemetry('failure');
    }

    return getDeleteTaskRunResult();
  }
}

async function resolveErrorMessage(
  error: unknown,
  inferenceClient: { getConnectorById: (id: string) => Promise<InferenceConnector> },
  connectorId: string,
  logger: Logger
): Promise<string> {
  if (!isInferenceProviderError(error)) {
    return parseError(error).message;
  }

  let connector;
  try {
    connector = await inferenceClient.getConnectorById(connectorId);
  } catch (connectorErr) {
    logger.warn(
      `Failed to fetch connector ${connectorId} for error enrichment: ${
        connectorErr instanceof Error ? connectorErr.message : String(connectorErr)
      }`
    );
  }

  return connector ? formatInferenceProviderError(error, connector) : parseError(error).message;
}

export function createStreamsFeaturesIdentificationTask(taskContext: TaskContext) {
  return {
    [FEATURES_IDENTIFICATION_TASK_TYPE]: {
      createTaskRunner: (runContext) => ({
        run: cancellableTask(
          () => runFeaturesIdentification(taskContext, runContext),
          runContext,
          taskContext
        ),
      }),
    },
  } satisfies TaskDefinitionRegistry;
}
