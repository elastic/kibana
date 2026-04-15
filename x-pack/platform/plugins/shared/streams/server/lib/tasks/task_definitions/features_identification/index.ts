/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDefinitionRegistry } from '@kbn/task-manager-plugin/server';
import { isInferenceProviderError, type InferenceConnector } from '@kbn/inference-common';
import { type IdentifyFeaturesResult, getStreamTypeFromDefinition } from '@kbn/streams-schema';
import { v4 as uuid } from 'uuid';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LogMeta } from '@kbn/logging';
import { STREAMS_SIG_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID } from '@kbn/streams-schema';
import { parseError } from '../../../streams/errors/parse_error';
import { formatInferenceProviderError } from '../../../../routes/utils/create_connector_sse_error';
import { resolveConnectorForFeature } from '../../../../routes/utils/resolve_connector_for_feature';
import type { TaskContext } from '..';
import type { TaskParams } from '../../types';
import { cancellableTask } from '../../cancellable_task';
import { isDefinitionNotFoundError } from '../../../streams/errors/definition_not_found_error';
import {
  createEmptyAccumulatedState,
  deriveSuccessCount,
  deriveTotalTokensUsed,
  identifyInferredFeatures,
  identifyComputedFeatures,
  type AccumulatedIterationState,
} from '../../../sig_events/features/features_identification_service';

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

function isCancellationError(message: string): boolean {
  return message.includes('ERR_CANCELED') || message.includes('Request was aborted');
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

  const taskDurationMs = () => Date.now() - new Date(_task.created_at).getTime();

  const runId = uuid();
  const trackEmptyTelemetry = (telemetryState: 'canceled' | 'failure') => {
    taskContext.telemetry.trackFeaturesIdentified({
      run_id: runId,
      iteration: 0,
      stream_name: streamName,
      stream_type: 'unknown',
      state: telemetryState,
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
    tuningConfig,
  } = await taskContext.getScopedClients({ request: fakeRequest });

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
  let state: AccumulatedIterationState = createEmptyAccumulatedState();

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
    const tuning = {
      sample_size: tuningConfig.sample_size,
      feature_ttl_days: tuningConfig.feature_ttl_days,
      entity_filtered_ratio: tuningConfig.entity_filtered_ratio,
      diverse_ratio: tuningConfig.diverse_ratio,
      max_excluded_features_in_prompt: tuningConfig.max_excluded_features_in_prompt,
      max_entity_filters: tuningConfig.max_entity_filters,
    };

    const computedFeaturesPromise = identifyComputedFeatures({
      stream,
      streamName: stream.name,
      start,
      end,
      esClient,
      featureClient,
      logger: taskLogger,
      featureTtlDays: tuningConfig.feature_ttl_days,
    });

    for (let i = 0; i < maxIterations; i++) {
      if (runContext.abortController.signal.aborted) {
        taskLogger.debug('Feature identification aborted');
        throw new Error('Request was aborted');
      }

      taskLogger.debug(
        () =>
          `Iteration ${i + 1}/${maxIterations}: ` +
          `${state.discoveredFeatures.length} features known, starting iteration`
      );

      const result = await identifyInferredFeatures({
        esClient,
        featureClient,
        soClient,
        inferenceClient: boundInferenceClient,
        logger: taskLogger,
        signal: runContext.abortController.signal,
        streamName: stream.name,
        streamType,
        start,
        end,
        runId,
        state,
        tuning,
        trackFeaturesIdentified,
      });

      if (!result.hasDocuments) {
        taskLogger.debug('Stopping: no documents available for sampling');
        break;
      }

      state = result.state;
    }

    if (state.iterationResults.length > 0 && deriveSuccessCount(state.iterationResults) === 0) {
      throw new Error(`All iterations failed for stream ${streamName}`);
    }

    const reconciledComputedFeatures = await computedFeaturesPromise.catch((err) => {
      taskLogger.warn(`Computed features generation failed: ${parseError(err).message}`);
      return [] as Awaited<ReturnType<typeof identifyComputedFeatures>>;
    });
    const allFeatures = [...state.discoveredFeatures, ...reconciledComputedFeatures];

    await taskClient.complete<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
      _task,
      { start, end, streamName, connectorId: connectorIdOverride },
      {
        features: allFeatures,
        durationMs: taskDurationMs(),
        iterations: state.iterationResults,
        totalTokensUsed: deriveTotalTokensUsed(state.iterationResults),
      }
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
      { start, end, streamName, connectorId: connectorIdOverride },
      errorMessage,
      {
        features: [],
        durationMs: taskDurationMs(),
        iterations: state.iterationResults,
        totalTokensUsed: deriveTotalTokensUsed(state.iterationResults),
      }
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
  logger: { warn: (msg: string) => void }
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
