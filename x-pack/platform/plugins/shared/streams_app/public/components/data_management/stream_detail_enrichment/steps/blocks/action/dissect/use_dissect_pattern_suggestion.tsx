/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractDissectPatternDangerouslySlow,
  getDissectProcessorWithReview,
  getReviewFields,
} from '@kbn/dissect-heuristics';
import { lastValueFrom } from 'rxjs';
import { usePatternSuggestionBase } from '../common/use_pattern_suggestion_base';
import { useKibana } from '../../../../../../../hooks/use_kibana';

export const SUGGESTED_DISSECT_PROCESSOR_ID = 'dissect-processor';

export interface DissectPatternSuggestionParams {
  streamName: string;
  connectorId: string;
  fieldName: string;
}

export function useDissectPatternSuggestion() {
  const {
    services: { telemetryClient },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  return usePatternSuggestionBase(
    {
      processorId: SUGGESTED_DISSECT_PROCESSOR_ID,
      extractPattern: (messages: string[]) => extractDissectPatternDangerouslySlow(messages),
      getReviewFields: (pattern, numExamples) => getReviewFields(pattern, numExamples),
      callReviewApiAndCreateProcessor: async (pattern, reviewFields, params) => {
        const reviewResult = await lastValueFrom(
          streamsRepositoryClient.stream(
            'POST /internal/streams/{name}/processing/_suggestions/dissect',
            {
              signal: params.signal,
              params: {
                path: { name: params.streamName },
                body: {
                  connector_id: params.connectorId,
                  sample_messages: params.messages,
                  pattern_object: reviewFields,
                },
              },
            }
          )
        );
        if (reviewResult.type !== 'result' || typeof reviewResult.dissectProcessor !== 'object') {
          throw new Error('Invalid dissect review response');
        }
        return getDissectProcessorWithReview(
          pattern,
          reviewResult.dissectProcessor,
          params.fieldName
        );
      },
      createStreamlangStep: (fieldName, processor) => ({
        action: 'dissect',
        customIdentifier: SUGGESTED_DISSECT_PROCESSOR_ID,
        from: fieldName,
        pattern: processor.pattern,
      }),
      telemetryMethod: 'startTrackingAIDissectSuggestionLatency',
      groupStrategy: 'largest',
    },
    {
      streamsRepositoryClient,
      telemetryClient,
    }
  );
}
