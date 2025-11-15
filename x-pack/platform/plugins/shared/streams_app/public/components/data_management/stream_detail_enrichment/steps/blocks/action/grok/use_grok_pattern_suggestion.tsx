/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractGrokPatternDangerouslySlow,
  getGrokProcessor,
  getReviewFields,
  mergeGrokProcessors,
  unwrapPatternDefinitions,
} from '@kbn/grok-heuristics';
import { lastValueFrom } from 'rxjs';
import { usePatternSuggestionBase } from '../common/use_pattern_suggestion_base';
import { useKibana } from '../../../../../../../hooks/use_kibana';

export const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

export interface GrokPatternSuggestionParams {
  streamName: string;
  connectorId: string;
  fieldName: string;
}

export function useGrokPatternSuggestion() {
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
      processorId: SUGGESTED_GROK_PROCESSOR_ID,
      extractPattern: (messages: string[]) => extractGrokPatternDangerouslySlow(messages),
      getReviewFields: (pattern, numExamples) => getReviewFields(pattern, numExamples),
      callReviewApiAndCreateProcessor: async (pattern, reviewFields, params) => {
        const reviewResult = await lastValueFrom(
          streamsRepositoryClient.stream(
            'POST /internal/streams/{name}/processing/_suggestions/grok',
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
        if (reviewResult.type !== 'result' || typeof reviewResult.grokProcessor !== 'object') {
          throw new Error('Invalid grok review response');
        }
        const grokProcessor = getGrokProcessor(pattern, {
          ...reviewResult.grokProcessor,
          fields: reviewResult.grokProcessor.fields.map((field) => ({
            name: field.ecs_field,
            columns: field.columns,
            grok_components: field.grok_components,
          })),
        });
        return {
          ...grokProcessor,
          patterns: unwrapPatternDefinitions(grokProcessor),
          pattern_definitions: {},
        };
      },
      createStreamlangStep: (fieldName, processor) => ({
        action: 'grok',
        customIdentifier: SUGGESTED_GROK_PROCESSOR_ID,
        from: fieldName,
        patterns: processor.patterns,
      }),
      telemetryMethod: 'startTrackingAIGrokSuggestionLatency',
      groupStrategy: 'all',
      mergeProcessors: (processors) => {
        const merged = mergeGrokProcessors(processors);
        return {
          ...merged,
          pattern_definitions: merged.pattern_definitions || {},
        };
      },
    },
    {
      streamsRepositoryClient,
      telemetryClient,
    }
  );
}
