/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import type { GrokProcessor } from '@kbn/streamlang';
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
  grokProcessor: GrokProcessor;
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
      return Promise.resolve(undefined);
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

    const finishTrackingAndReport = telemetryClient.startTrackingAIGrokSuggestionLatency({
      name: params.streamName,
      field: params.fieldName,
      connector_id: params.connectorId,
    });

    try {
      const { grokProcessor } = await lastValueFrom(
        streamsRepositoryClient.stream(
          'POST /internal/streams/{name}/processing/_suggestions/grok',
          {
            signal: abortController.signal,
            params: {
              path: { name: params.streamName },
              body: {
                connector_id: params.connectorId,
                field_name: params.fieldName,
                sample_messages: messages,
              },
            },
          }
        )
      );

      if (!grokProcessor) {
        throw new NoSuggestionsError();
      }

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
                    ...grokProcessor,
                    customIdentifier: SUGGESTED_GROK_PROCESSOR_ID,
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

      return { grokProcessor, simulationResult };
    } catch (error) {
      finishTrackingAndReport(0, [0]);

      if (!isNoSuggestionsError(error) && !isRequestAbortedError(error)) {
        showFetchErrorToast(error as Error);
      }

      throw error;
    }
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
