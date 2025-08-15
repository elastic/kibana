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
import {
  getUsefulTokens,
  getReviewFields,
  getGrokProcessor,
  mergeGrokProcessors,
  groupMessagesByPattern,
  syncExtractTemplate,
  type GrokProcessorResult,
} from '@kbn/grok-heuristics';
import { get } from 'lodash';
import { useKibana } from '../../../../../hooks/use_kibana';
import { showErrorToast } from '../../../../../hooks/use_streams_app_fetch';
import {
  selectOriginalPreviewRecords,
  selectPreviewRecords,
} from '../../state_management/simulation_state_machine/selectors';
import { useSimulatorSelector } from '../../state_management/stream_enrichment_state_machine';
import { simulateProcessing } from '../../state_management/simulation_state_machine/simulation_runner_actor';

export const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

export interface GrokPatternSuggestionParams {
  streamName: string;
  connectorId: string;
  fieldName: string;
}

export function useGrokPatternSuggestion() {
  const {
    core: { notifications },
    services: { telemetryClient },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const abortController = useAbortController();
  const processorsWithoutCurrent = useSimulatorSelector((snapshot) =>
    snapshot.context.processors.slice(0, -1)
  );
  const previewDocsFilter = useSimulatorSelector((snapshot) => snapshot.context.previewDocsFilter);
  const originalSamples = useSimulatorSelector((snapshot) =>
    selectOriginalPreviewRecords(snapshot.context)
  );

  return useAsyncFn(
    async (params: GrokPatternSuggestionParams | null) => {
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
      if (processorsWithoutCurrent.length > 0) {
        const simulation = await simulateProcessing({
          streamsRepositoryClient,
          input: {
            streamName: params.streamName,
            processors: processorsWithoutCurrent,
            documents: samples,
          },
        });

        samples = selectPreviewRecords({
          samples: originalSamples,
          previewDocsFilter,
          simulation,
        });
      }

      const messages = samples.reduce<string[]>((acc, sample) => {
        const value = get(sample, params.fieldName);
        if (typeof value === 'string') {
          acc.push(value);
        }
        return acc;
      }, []);

      const groupedMessages = groupMessagesByPattern(messages);

      const finishTrackingAndReport = telemetryClient.startTrackingAIGrokSuggestionLatency({
        name: params.streamName,
        field: params.fieldName,
        connector_id: params.connectorId,
      });

      const result = await Promise.allSettled(
        groupedMessages.map((group) => {
          const { roots, delimiter } = syncExtractTemplate(group.messages);
          const { usefulTokens, usefulColumns } = getUsefulTokens(roots, delimiter);
          const reviewFields = getReviewFields(usefulColumns, 10);

          return streamsRepositoryClient
            .fetch('POST /internal/streams/{name}/processing/_suggestions/grok', {
              signal: abortController.signal,
              params: {
                path: { name: params.streamName },
                body: {
                  connector_id: params.connectorId,
                  sample_messages: messages.slice(0, 10),
                  review_fields: reviewFields,
                },
              },
            })
            .then(
              (response) => {
                const grokProcessor = getGrokProcessor(usefulTokens, reviewFields, response);
                const inlinedGrokPatterns = inlineGrokPatterns(combinedGrokProcessor);

                finishTrackingAndReport(1, [1]);

                return {
                  ...grokProcessor,
                  patterns: inlinedGrokPatterns,
                  pattern_definitions: {},
                };
              },
              (error: Error) => {
                showErrorToast(notifications, error);
                throw error;
              }
            );
        })
      );

      // If all promises failed, throw the first error
      if (
        result.every(
          (settledState): settledState is PromiseRejectedResult =>
            settledState.status === 'rejected'
        )
      ) {
        throw result[0].reason;
      }

      // Otherwise, ignore errors and continue with fulfilled results
      const grokProcessors = result.reduce<GrokProcessorResult[]>((acc, settledState) => {
        if (settledState.status === 'fulfilled') {
          acc.push(settledState.value);
        }
        return acc;
      }, []);

      // Combine all grok processors into a single one with fallback patterns
      const combinedGrokProcessor = mergeGrokProcessors(grokProcessors);

      // Run simulation to get fields and metrics
      const simulationResult = await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/processing/_simulate',
        {
          signal: abortController.signal,
          params: {
            path: { name: params.streamName },
            body: {
              documents: samples,
              processing: {
                steps: [
                  {
                    action: 'grok',
                    customIdentifier: SUGGESTED_GROK_PROCESSOR_ID,
                    from: params.fieldName,
                    patterns: combinedGrokProcessor.patterns,
                  },
                ],
              },
            },
          },
        }
      );

      return { grokProcessor: combinedGrokProcessor, simulationResult };
    },
    [
      abortController,
      processorsWithoutCurrent,
      previewDocsFilter,
      originalSamples,
      notifications,
      streamsRepositoryClient,
      telemetryClient,
    ]
  );
}

function inlineGrokPatterns(grokProcessor: GrokProcessorResult): string[] {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { patterns, pattern_definitions } = grokProcessor;

  if (!pattern_definitions || Object.keys(pattern_definitions).length === 0) {
    return patterns;
  }

  // Recursively inline a single pattern
  function inlinePattern(pattern: string, seen: Set<string> = new Set()): string {
    // Match %{PATTERN_NAME} or %{PATTERN_NAME:field}
    return pattern.replace(/%{([A-Z0-9_]+)(:[^}]*)?}/g, (match, key, fieldName) => {
      if (pattern_definitions && pattern_definitions[key]) {
        if (seen.has(key)) {
          // Prevent infinite recursion on cyclic definitions
          return match;
        }
        seen.add(key);
        const inlined = inlinePattern(pattern_definitions[key], seen);
        seen.delete(key);
        if (fieldName) {
          // Named capture group
          return `(?<${fieldName.substring(1)}>${inlined})`;
        }
        return `(${inlined})`;
      }
      return match; // Leave as is if not in patternDefs
    });
  }

  return patterns.map((pattern) => inlinePattern(pattern));
}
