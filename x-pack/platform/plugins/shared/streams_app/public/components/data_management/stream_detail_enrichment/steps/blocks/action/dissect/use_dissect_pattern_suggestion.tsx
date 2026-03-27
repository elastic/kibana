/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsyncFn from 'react-use/lib/useAsyncFn';
import { lastValueFrom } from 'rxjs';
import type { useAbortController } from '@kbn/react-hooks';
import { useFetchErrorToast } from '../../../../../../../hooks/use_fetch_error_toast';
import { NoSuggestionsError, isNoSuggestionsError } from '../utils/no_suggestions_error';
import {
  usePatternSuggestionDependencies,
  prepareSamplesForPatternExtraction,
  extractMessagesFromField,
} from '../utils/pattern_suggestion_helpers';

export const SUGGESTED_DISSECT_PROCESSOR_ID = 'dissect-processor';

export interface DissectPatternSuggestionParams {
  streamName: string;
  connectorId: string;
  fieldName: string;
}

export function useDissectPatternSuggestion(
  abortController: ReturnType<typeof useAbortController>
) {
  const {
    notifications,
    telemetryClient,
    streamsRepositoryClient,
    stepsWithoutCurrent,
    previewDocsFilter,
    originalSamples,
  } = usePatternSuggestionDependencies();

  const showFetchErrorToast = useFetchErrorToast();

  return useAsyncFn(
    async (params: DissectPatternSuggestionParams | null) => {
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

      const finishTrackingAndReport = telemetryClient.startTrackingAIDissectSuggestionLatency({
        name: params.streamName,
        field: params.fieldName,
        connector_id: params.connectorId,
      });

      try {
        const { dissectProcessor } = await lastValueFrom(
          streamsRepositoryClient.stream(
            'POST /internal/streams/{name}/processing/_suggestions/dissect',
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

        if (!dissectProcessor) {
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
                      ...dissectProcessor,
                      customIdentifier: SUGGESTED_DISSECT_PROCESSOR_ID,
                    },
                  ],
                },
              },
            },
          }
        );

        const parsedRate =
          simulationResult.processors_metrics[SUGGESTED_DISSECT_PROCESSOR_ID].parsed_rate;

        finishTrackingAndReport(1, [parsedRate]);

        return {
          dissectProcessor,
          simulationResult,
        };
      } catch (error) {
        finishTrackingAndReport(0, [0]);
        if (!isNoSuggestionsError(error)) {
          showFetchErrorToast(error as Error);
        }
        throw error;
      }
    },
    [
      abortController,
      stepsWithoutCurrent,
      previewDocsFilter,
      originalSamples,
      notifications,
      streamsRepositoryClient,
      telemetryClient,
    ]
  );
}
