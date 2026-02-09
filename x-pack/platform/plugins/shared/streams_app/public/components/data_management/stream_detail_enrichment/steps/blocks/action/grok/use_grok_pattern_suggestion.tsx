/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import {
  getReviewFields,
  getGrokProcessor,
  mergeGrokProcessors,
  groupMessagesByPattern,
  extractGrokPatternDangerouslySlow,
  type GrokProcessorResult,
} from '@kbn/grok-heuristics';
import { lastValueFrom } from 'rxjs';
import { useFetchErrorToast } from '../../../../../../../hooks/use_fetch_error_toast';
import type { Simulation } from '../../../../state_management/simulation_state_machine/types';
import { NoSuggestionsError, isNoSuggestionsError } from '../utils/no_suggestions_error';
import {
  usePatternSuggestionDependencies,
  prepareSamplesForPatternExtraction,
  extractMessagesFromField,
} from '../utils/pattern_suggestion_helpers';

export const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

export interface GrokPatternSuggestionParams {
  streamName: string;
  connectorId: string;
  fieldName: string;
}

export interface GrokPatternSuggestionResult {
  grokProcessor: GrokProcessorResult;
  simulationResult: Simulation;
}

export function useGrokPatternSuggestion(abortController: ReturnType<typeof useAbortController>) {
  const {
    notifications,
    telemetryClient,
    streamsRepositoryClient,
    stepsWithoutCurrent,
    previewDocsFilter,
    originalSamples,
  } = usePatternSuggestionDependencies();

  const showFetchErrorToast = useFetchErrorToast();

  // Function overloads for the async function
  async function suggestGrokPattern(params: null): Promise<undefined>;
  async function suggestGrokPattern(
    params: GrokPatternSuggestionParams
  ): Promise<GrokPatternSuggestionResult>;
  async function suggestGrokPattern(
    params: GrokPatternSuggestionParams | null
  ): Promise<GrokPatternSuggestionResult | undefined> {
    if (params === null) {
      return Promise.resolve(undefined); // Reset to initial value
    }

    // Prepare samples by running partial simulation if needed
    const samples = await prepareSamplesForPatternExtraction(
      originalSamples,
      stepsWithoutCurrent,
      previewDocsFilter,
      streamsRepositoryClient,
      params.streamName
    );

    // Extract string messages from the target field
    const messages = extractMessagesFromField(samples, params.fieldName);

    const groupedMessages = groupMessagesByPattern(messages);

    const finishTrackingAndReport = telemetryClient.startTrackingAIGrokSuggestionLatency({
      name: params.streamName,
      field: params.fieldName,
      connector_id: params.connectorId,
    });

    const result = await Promise.allSettled(
      groupedMessages.map((group) => {
        const grokPatternNodes = extractGrokPatternDangerouslySlow(group.messages);

        // The only reason we're streaming the response here is to avoid timeout issues prevalent with long-running requests to LLMs.
        // There is only ever going to be a single event emitted so we can safely use `lastValueFrom`.
        return lastValueFrom(
          streamsRepositoryClient.stream(
            'POST /internal/streams/{name}/processing/_suggestions/grok',
            {
              signal: abortController.signal,
              params: {
                path: { name: params.streamName },
                body: {
                  connector_id: params.connectorId,
                  sample_messages: group.messages.slice(0, 10),
                  review_fields: getReviewFields(grokPatternNodes, 10),
                },
              },
            }
          )
        ).then((reviewResult) => {
          // Handle case where LLM couldn't generate suggestions
          if (reviewResult.grokProcessor === null) {
            throw new NoSuggestionsError();
          }

          return getGrokProcessor(grokPatternNodes, reviewResult.grokProcessor);
        });
      })
    );

    const aggregateError = new AggregateError(
      result.reduce<Error[]>((acc, settledState) => {
        if (settledState.status === 'rejected') {
          acc.push(settledState.reason);
        }
        return acc;
      }, [])
    );

    const grokProcessors = result.reduce<GrokProcessorResult[]>((acc, settledState) => {
      if (settledState.status === 'fulfilled') {
        acc.push(settledState.value);
      }
      return acc;
    }, []);

    // If all promises failed, throw an aggregate error, otherwise ignore errors and continue with fulfilled results
    if (grokProcessors.length === 0) {
      finishTrackingAndReport(0, [0]);

      // Check if all errors are NoSuggestionsError - if so, throw a single NoSuggestionsError
      const allNoSuggestions = aggregateError.errors.every((error) => isNoSuggestionsError(error));
      if (allNoSuggestions) {
        throw new NoSuggestionsError();
      }

      // Don't show error toast for abort errors - they're expected when user cancels
      const hasNonAbortError = aggregateError.errors.some((error) => !isRequestAbortedError(error));
      if (hasNonAbortError) {
        showFetchErrorToast(aggregateError);
      }

      throw aggregateError;
    }

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
                  pattern_definitions: combinedGrokProcessor.pattern_definitions,
                },
              ],
            },
          },
        },
      }
    );

    finishTrackingAndReport(1, [
      simulationResult.processors_metrics[SUGGESTED_GROK_PROCESSOR_ID].parsed_rate,
    ]);

    return { grokProcessor: combinedGrokProcessor, simulationResult };
  }

  return useAsyncFn(suggestGrokPattern, [
    abortController,
    stepsWithoutCurrent,
    previewDocsFilter,
    originalSamples,
    notifications,
    streamsRepositoryClient,
    telemetryClient,
  ]);
}
