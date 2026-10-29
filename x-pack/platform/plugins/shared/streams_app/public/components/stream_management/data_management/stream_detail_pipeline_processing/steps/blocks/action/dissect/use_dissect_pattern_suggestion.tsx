/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { AsyncFnReturn } from 'react-use/lib/useAsyncFn';
import { lastValueFrom } from 'rxjs';
import type { useAbortController } from '@kbn/react-hooks';
import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import { useFetchErrorToast } from '../../../../../../../../hooks/use_fetch_error_toast';
import { uiDefinitionToProcessors } from '../../../../ingest_pipeline_processors';
import { NoSuggestionsError, isNoSuggestionsError } from '../utils/no_suggestions_error';
import {
  usePatternSuggestionDependencies,
  prepareSamplesForPatternExtraction,
  extractMessagesFromField,
} from '../utils/pattern_suggestion_helpers';
import type {
  DissectFormState,
  PipelineProcessorDefinitionWithUIAttributes,
} from '../../../../types';

export const SUGGESTED_DISSECT_PROCESSOR_ID = 'dissect-processor';

export interface DissectPatternSuggestionParams {
  streamName: string;
  connectorId: string;
  fieldName: string;
}

export interface DissectPatternSuggestionResult {
  dissectProcessor: DissectFormState;
  simulationResult: APIReturnType<'POST /internal/streams/{name}/processing/_simulate'>;
}

export function useDissectPatternSuggestion(
  abortController: ReturnType<typeof useAbortController>
): AsyncFnReturn<
  (
    params: DissectPatternSuggestionParams | null
  ) => Promise<DissectPatternSuggestionResult | undefined>
> {
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
        const nativeDissectProcessor: DissectFormState = {
          ...dissectProcessor,
          action: 'dissect',
          field: dissectProcessor.from,
        };
        const simulationStep: PipelineProcessorDefinitionWithUIAttributes = {
          ...nativeDissectProcessor,
          customIdentifier: SUGGESTED_DISSECT_PROCESSOR_ID,
          parentId: null,
        };

        const simulationResult = await streamsRepositoryClient.fetch(
          'POST /internal/streams/{name}/processing/_simulate',
          {
            signal: abortController.signal,
            params: {
              path: { name: params.streamName },
              body: {
                documents: samples,
                processors: uiDefinitionToProcessors(
                  {
                    steps: [simulationStep],
                  },
                  { includeGeneratedTags: true }
                ),
              },
            },
          }
        );

        const parsedRate =
          simulationResult.processors_metrics[SUGGESTED_DISSECT_PROCESSOR_ID]?.parsed_rate ?? 0;

        finishTrackingAndReport(1, [parsedRate]);

        return {
          dissectProcessor: nativeDissectProcessor,
          simulationResult,
        };
      } catch (error) {
        finishTrackingAndReport(0, [0]);
        if (!isNoSuggestionsError(error) && !isRequestAbortedError(error)) {
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
