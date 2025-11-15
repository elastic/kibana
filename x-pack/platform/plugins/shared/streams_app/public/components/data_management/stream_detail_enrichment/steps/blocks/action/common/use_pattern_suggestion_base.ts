/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';
import { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import { groupMessagesByPattern } from '@kbn/grok-heuristics';
import { get } from 'lodash';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { StreamlangStep } from '@kbn/streamlang';
import type { StreamsTelemetryClient } from '../../../../../../../telemetry/client';
import {
  selectOriginalPreviewRecords,
  selectPreviewRecords,
} from '../../../../state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from '../../../../state_management/stream_enrichment_state_machine';
import { simulateProcessing } from '../../../../state_management/simulation_state_machine/simulation_runner_actor';

export interface PatternSuggestionParams {
  streamName: string;
  connectorId: string;
  fieldName: string;
}

export interface PatternSuggestionConfig<TPattern, TProcessor, TReviewFields> {
  processorId: string;
  extractPattern: (messages: string[]) => TPattern;
  getReviewFields: (pattern: TPattern, numExamples: number) => TReviewFields;
  callReviewApiAndCreateProcessor: (
    pattern: TPattern,
    reviewFields: TReviewFields,
    params: {
      streamName: string;
      connectorId: string;
      messages: string[];
      fieldName: string;
      signal: AbortSignal;
    }
  ) => Promise<TProcessor>;
  createStreamlangStep: (fieldName: string, processor: TProcessor) => StreamlangStep;
  telemetryMethod:
    | 'startTrackingAIGrokSuggestionLatency'
    | 'startTrackingAIDissectSuggestionLatency';
  groupStrategy: 'all' | 'largest';
  mergeProcessors?: (processors: TProcessor[]) => TProcessor;
}

export interface SimulationResult {
  processors_metrics: Record<string, { parsed_rate: number }>;
}

export interface PatternSuggestionResult<TProcessor> {
  processor: TProcessor;
  simulationResult: SimulationResult;
}

/**
 * Base hook for pattern suggestions (grok, dissect, etc.)
 * Extracts common logic for sample preparation, message grouping,
 * LLM review, and simulation validation.
 */
export function usePatternSuggestionBase<TPattern, TProcessor, TReviewFields>(
  config: PatternSuggestionConfig<TPattern, TProcessor, TReviewFields>,
  dependencies: {
    streamsRepositoryClient: StreamsRepositoryClient;
    telemetryClient: StreamsTelemetryClient;
  }
) {
  const abortController = useAbortController();
  const stepsWithoutCurrent = useSimulatorSelector((snapshot) =>
    snapshot.context.steps.slice(0, -1)
  );
  const previewDocsFilter = useSimulatorSelector((snapshot) => snapshot.context.previewDocsFilter);
  const originalSamples = useSimulatorSelector((snapshot) =>
    selectOriginalPreviewRecords(snapshot.context)
  );

  return useAsyncFn(
    async (params: PatternSuggestionParams | null) => {
      if (params === null) {
        return Promise.resolve(undefined); // Reset to initial value
      }

      let samples = originalSamples
        .map((doc) => doc.document)
        .map(flattenObjectNestedLast) as FlattenRecord[];

      /**
       * If there are processors, we run a partial simulation to get the samples.
       * If there are no processors, we use the original samples previously assigned.
       */
      if (stepsWithoutCurrent.length > 0) {
        const simulation = await simulateProcessing({
          streamsRepositoryClient: dependencies.streamsRepositoryClient,
          input: {
            streamName: params.streamName,
            steps: stepsWithoutCurrent,
            documents: samples,
          },
        });

        samples = selectPreviewRecords({
          samples: originalSamples,
          previewDocsFilter,
          simulation,
        });
      }

      // Extract string messages from the specified field
      const messages = samples.reduce<string[]>((acc, sample) => {
        const value = get(sample, params.fieldName);
        if (typeof value === 'string') {
          acc.push(value);
        }
        return acc;
      }, []);

      // Group messages by pattern
      const groupedMessages = groupMessagesByPattern(messages);

      // Select groups based on strategy
      const groups = config.groupStrategy === 'largest' ? [groupedMessages[0]] : groupedMessages;

      // Start telemetry tracking
      const finishTrackingAndReport = dependencies.telemetryClient[config.telemetryMethod]({
        name: params.streamName,
        field: params.fieldName,
        connector_id: params.connectorId,
      });

      // Process each group
      const result = await Promise.allSettled(
        groups.map(async (group) => {
          // Extract pattern from messages
          const pattern = config.extractPattern(group.messages);

          // Get review fields for LLM
          const reviewFields = config.getReviewFields(pattern, 10);

          // Call LLM for field review and create processor
          return config.callReviewApiAndCreateProcessor(pattern, reviewFields, {
            streamName: params.streamName,
            connectorId: params.connectorId,
            messages: group.messages.slice(0, 10),
            fieldName: params.fieldName,
            signal: abortController.signal,
          });
        })
      );

      // Extract fulfilled processors
      const processors = result.reduce<TProcessor[]>((acc, settledState) => {
        if (settledState.status === 'fulfilled') {
          acc.push(settledState.value);
        }
        return acc;
      }, []);

      // If all promises failed, throw aggregate error
      if (processors.length === 0) {
        const aggregateError = new AggregateError(
          result.reduce<Error[]>((acc, settledState) => {
            if (settledState.status === 'rejected') {
              acc.push(settledState.reason);
            }
            return acc;
          }, [])
        );
        finishTrackingAndReport(0, [0]);
        throw aggregateError;
      }

      // Merge processors if needed (for grok fallback patterns)
      const finalProcessor = config.mergeProcessors
        ? config.mergeProcessors(processors)
        : processors[0];

      // Run simulation to validate the processor
      const simulationResult = await dependencies.streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/processing/_simulate',
        {
          signal: abortController.signal,
          params: {
            path: { name: params.streamName },
            body: {
              documents: samples,
              processing: {
                steps: [config.createStreamlangStep(params.fieldName, finalProcessor)],
              },
            },
          },
        }
      );

      // Track telemetry
      const parsedRate = simulationResult.processors_metrics[config.processorId].parsed_rate;
      finishTrackingAndReport(1, [parsedRate]);

      return {
        processor: finalProcessor,
        simulationResult,
      };
    },
    [
      abortController,
      stepsWithoutCurrent,
      previewDocsFilter,
      originalSamples,
      dependencies.streamsRepositoryClient,
      dependencies.telemetryClient,
    ]
  );
}
