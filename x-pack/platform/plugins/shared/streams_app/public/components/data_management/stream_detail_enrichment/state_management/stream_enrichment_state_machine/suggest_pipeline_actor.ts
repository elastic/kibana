/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, map } from 'rxjs';
import { fromPromise } from 'xstate5';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import type { NotificationsStart } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { streamlangDSLSchema, type StreamlangDSL } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import {
  extractGrokPatternDangerouslySlow,
  getGrokProcessor,
  getReviewFields,
  groupMessagesByPattern,
  mergeGrokProcessors,
  unwrapPatternDefinitions,
  type GrokProcessorResult,
} from '@kbn/grok-heuristics';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import { showErrorToast } from '../../../../../hooks/use_streams_app_fetch';
import { PRIORITIZED_CONTENT_FIELDS, getDefaultTextField } from '../../utils';
import { extractMessagesFromField } from '../../steps/blocks/action/utils/pattern_suggestion_helpers';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine/types';

// Minimal input needed from state machine (services injected in implementation)
export interface SuggestPipelineInputMinimal {
  streamName: string;
  connectorId: string;
  documents: SampleDocumentWithUIAttributes[];
}

export interface SuggestPipelineInput extends SuggestPipelineInputMinimal {
  signal: AbortSignal;
  streamsRepositoryClient: StreamsRepositoryClient;
  telemetryClient: StreamsTelemetryClient;
  notifications: NotificationsStart;
}

const SUGGESTED_GROK_PROCESSOR_ID = 'grok-processor';

export async function suggestPipelineLogic(input: SuggestPipelineInput): Promise<StreamlangDSL> {
  // Extract FlattenRecord documents from SampleDocumentWithUIAttributes
  const documents: FlattenRecord[] = input.documents.map(
    (doc) => flattenObjectNestedLast(doc.document) as FlattenRecord
  );

  // Determine the best field to use for grok pattern extraction
  const fieldName = getDefaultTextField(documents, PRIORITIZED_CONTENT_FIELDS);

  // Step 1: Generate grok patterns
  const messages = extractMessagesFromField(documents, fieldName);
  const groupedMessages = groupMessagesByPattern(messages);

  const finishTrackingGrok = input.telemetryClient.startTrackingAIGrokSuggestionLatency({
    name: input.streamName,
    field: fieldName,
    connector_id: input.connectorId,
  });

  // Request grok patterns for each message group in parallel
  const grokResults = await Promise.allSettled(
    groupedMessages.map((group) => {
      const grokPatternNodes = extractGrokPatternDangerouslySlow(group.messages);

      return lastValueFrom(
        input.streamsRepositoryClient.stream(
          'POST /internal/streams/{name}/processing/_suggestions/grok',
          {
            signal: input.signal,
            params: {
              path: { name: input.streamName },
              body: {
                connector_id: input.connectorId,
                sample_messages: group.messages.slice(0, 10),
                review_fields: getReviewFields(grokPatternNodes, 10),
              },
            },
          }
        )
      ).then((reviewResult) => {
        const grokProcessor = getGrokProcessor(grokPatternNodes, reviewResult.grokProcessor);

        return {
          ...grokProcessor,
          patterns: unwrapPatternDefinitions(grokProcessor), // NOTE: Inline patterns until we support custom pattern definitions in Streamlang
          pattern_definitions: {},
        };
      });
    })
  );

  // Collect errors and successful results
  const aggregateError = new AggregateError(
    grokResults.reduce<Error[]>((acc, result) => {
      if (result.status === 'rejected') {
        acc.push(result.reason);
      }
      return acc;
    }, [])
  );

  const grokProcessors = grokResults.reduce<GrokProcessorResult[]>((acc, result) => {
    if (result.status === 'fulfilled') {
      acc.push(result.value);
    }
    return acc;
  }, []);

  // If all grok pattern requests failed, throw error
  if (grokProcessors.length === 0) {
    finishTrackingGrok(0, [0]);

    // Don't show error toast for abort errors
    const hasNonAbortError = aggregateError.errors.some((error) => !isRequestAbortedError(error));
    if (hasNonAbortError) {
      showErrorToast(input.notifications, aggregateError);
    }

    throw aggregateError;
  }

  // Merge all grok processors into one
  const combinedGrokProcessor = mergeGrokProcessors(grokProcessors);

  // Run simulation to verify grok patterns work
  const simulationResult = await input.streamsRepositoryClient.fetch(
    'POST /internal/streams/{name}/processing/_simulate',
    {
      signal: input.signal,
      params: {
        path: { name: input.streamName },
        body: {
          documents,
          processing: {
            steps: [
              {
                action: 'grok',
                customIdentifier: SUGGESTED_GROK_PROCESSOR_ID,
                from: fieldName,
                patterns: combinedGrokProcessor.patterns,
              },
            ],
          },
        },
      },
    }
  );

  finishTrackingGrok(1, [
    simulationResult.processors_metrics[SUGGESTED_GROK_PROCESSOR_ID].parsed_rate,
  ]);

  // Step 2: Generate full pipeline using the grok processor
  const pipeline = await lastValueFrom(
    input.streamsRepositoryClient
      .stream('POST /internal/streams/{name}/_suggest_processing_pipeline', {
        signal: input.signal,
        params: {
          path: { name: input.streamName },
          body: {
            connector_id: input.connectorId,
            documents,
            parsing_processor: {
              action: 'grok',
              from: fieldName,
              patterns: combinedGrokProcessor.patterns as [string, ...string[]],
            },
          },
        },
      })
      .pipe(map((event) => streamlangDSLSchema.parse(event.pipeline)))
  );

  return pipeline;
}

export const createSuggestPipelineActor = () => {
  return fromPromise<StreamlangDSL, SuggestPipelineInput>(async ({ input }) =>
    suggestPipelineLogic(input)
  );
};
