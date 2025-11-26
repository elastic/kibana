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
  getReviewFields as getGrokReviewFields,
  groupMessagesByPattern as groupMessagesByGrokPattern,
  mergeGrokProcessors,
  unwrapPatternDefinitions,
  type GrokProcessorResult,
} from '@kbn/grok-heuristics';
import {
  extractDissectPattern,
  getDissectProcessorWithReview,
  getReviewFields as getDissectReviewFields,
  groupMessagesByPattern as groupMessagesByDissectPattern,
} from '@kbn/dissect-heuristics';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
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
const SUGGESTED_DISSECT_PROCESSOR_ID = 'dissect-processor';

interface GrokParsingProcessor {
  action: 'grok';
  from: string;
  patterns: [string, ...string[]];
}

interface DissectParsingProcessor {
  action: 'dissect';
  from: string;
  pattern: string;
}

interface ParsingProcessorCandidate {
  type: 'grok' | 'dissect';
  processor: GrokParsingProcessor | DissectParsingProcessor;
  parsedRate: number;
}

export async function suggestPipelineLogic(input: SuggestPipelineInput): Promise<StreamlangDSL> {
  // Extract FlattenRecord documents from SampleDocumentWithUIAttributes
  const documents: FlattenRecord[] = input.documents.map(
    (doc) => flattenObjectNestedLast(doc.document) as FlattenRecord
  );

  // Determine the best field to use for pattern extraction
  const fieldName = getDefaultTextField(documents, PRIORITIZED_CONTENT_FIELDS);
  const messages = extractMessagesFromField(documents, fieldName);

  // Step 1: Generate both grok and dissect patterns in parallel
  const [grokCandidate, dissectCandidate] = await Promise.all([
    generateGrokProcessor(input, messages, fieldName, documents),
    generateDissectProcessor(input, messages, fieldName, documents),
  ]);

  // Step 2: Pick the better parsing processor based on parsed rate
  const candidates = [grokCandidate, dissectCandidate].filter(
    (c): c is ParsingProcessorCandidate => c !== null
  );

  if (candidates.length === 0) {
    throw new Error('Both grok and dissect pattern generation failed');
  }

  // Sort by parsed rate (highest first) and pick the best one
  candidates.sort((a, b) => b.parsedRate - a.parsedRate);
  const bestCandidate = candidates[0];

  // Step 3: Generate full pipeline using the best parsing processor
  const pipeline = await lastValueFrom(
    input.streamsRepositoryClient
      .stream('POST /internal/streams/{name}/_suggest_processing_pipeline', {
        signal: input.signal,
        params: {
          path: { name: input.streamName },
          body: {
            connector_id: input.connectorId,
            documents,
            parsing_processor: bestCandidate.processor,
          },
        },
      })
      .pipe(map((event) => streamlangDSLSchema.parse(event.pipeline)))
  );

  return pipeline;
}

/**
 * Generate grok processor from messages
 */
async function generateGrokProcessor(
  input: SuggestPipelineInput,
  messages: string[],
  fieldName: string,
  documents: FlattenRecord[]
): Promise<ParsingProcessorCandidate | null> {
  const groupedMessages = groupMessagesByGrokPattern(messages);

  const finishTrackingGrok = input.telemetryClient.startTrackingAIGrokSuggestionLatency({
    name: input.streamName,
    field: fieldName,
    connector_id: input.connectorId,
  });

  try {
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
                  review_fields: getGrokReviewFields(grokPatternNodes, 10),
                },
              },
            }
          )
        ).then((reviewResult) => {
          const grokProcessor = getGrokProcessor(grokPatternNodes, reviewResult.grokProcessor);

          return {
            ...grokProcessor,
            patterns: unwrapPatternDefinitions(grokProcessor),
            pattern_definitions: {},
          };
        });
      })
    );

    // Collect successful results
    const grokProcessors = grokResults.reduce<GrokProcessorResult[]>((acc, result) => {
      if (result.status === 'fulfilled') {
        acc.push(result.value);
      }
      return acc;
    }, []);

    if (grokProcessors.length === 0) {
      finishTrackingGrok(0, [0]);
      return null;
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

    const parsedRate =
      simulationResult.processors_metrics[SUGGESTED_GROK_PROCESSOR_ID]?.parsed_rate ?? 0;

    finishTrackingGrok(1, [parsedRate]);

    return {
      type: 'grok',
      processor: {
        action: 'grok',
        from: fieldName,
        patterns: combinedGrokProcessor.patterns as [string, ...string[]],
      },
      parsedRate,
    };
  } catch (error) {
    finishTrackingGrok(0, [0]);

    // Don't show error toast for abort errors, just return null
    if (!isRequestAbortedError(error)) {
      // Log but don't throw - we want to try dissect even if grok fails
      // eslint-disable-next-line no-console
      console.warn('Grok pattern generation failed:', error);
    }
    return null;
  }
}

/**
 * Generate dissect processor from messages
 */
async function generateDissectProcessor(
  input: SuggestPipelineInput,
  messages: string[],
  fieldName: string,
  documents: FlattenRecord[]
): Promise<ParsingProcessorCandidate | null> {
  const finishTrackingDissect = input.telemetryClient.startTrackingAIDissectSuggestionLatency({
    name: input.streamName,
    field: fieldName,
    connector_id: input.connectorId,
  });

  try {
    // Group messages by pattern and use only the largest group for dissect
    const groupedMessages = groupMessagesByDissectPattern(messages);
    const largestGroup = groupedMessages[0]; // Groups are sorted by probability (descending)

    if (!largestGroup || largestGroup.messages.length === 0) {
      finishTrackingDissect(0, [0]);
      return null;
    }

    // Extract dissect pattern from the largest group
    const dissectPattern = extractDissectPattern(largestGroup.messages);

    if (dissectPattern.fields.length === 0) {
      finishTrackingDissect(0, [0]);
      return null;
    }

    // Call LLM to review and map fields to ECS
    const reviewResult = await lastValueFrom(
      input.streamsRepositoryClient.stream(
        'POST /internal/streams/{name}/processing/_suggestions/dissect',
        {
          signal: input.signal,
          params: {
            path: { name: input.streamName },
            body: {
              connector_id: input.connectorId,
              sample_messages: largestGroup.messages.slice(0, 10),
              review_fields: getDissectReviewFields(dissectPattern, 10),
            },
          },
        }
      )
    );

    const dissectProcessor = getDissectProcessorWithReview(
      dissectPattern,
      reviewResult.dissectProcessor,
      fieldName
    );

    // Run simulation to verify dissect pattern works
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
                  action: 'dissect',
                  customIdentifier: SUGGESTED_DISSECT_PROCESSOR_ID,
                  from: fieldName,
                  pattern: dissectProcessor.pattern,
                },
              ],
            },
          },
        },
      }
    );

    const parsedRate =
      simulationResult.processors_metrics[SUGGESTED_DISSECT_PROCESSOR_ID]?.parsed_rate ?? 0;

    finishTrackingDissect(1, [parsedRate]);

    return {
      type: 'dissect',
      processor: {
        action: 'dissect',
        from: fieldName,
        pattern: dissectProcessor.pattern,
      },
      parsedRate,
    };
  } catch (error) {
    finishTrackingDissect(0, [0]);

    // Don't show error toast for abort errors, just return null
    if (!isRequestAbortedError(error)) {
      // Log but don't throw - we want to try grok even if dissect fails
      // eslint-disable-next-line no-console
      console.warn('Dissect pattern generation failed:', error);
    }
    return null;
  }
}

export const createSuggestPipelineActor = () => {
  return fromPromise<StreamlangDSL, SuggestPipelineInput>(async ({ input }) =>
    suggestPipelineLogic(input)
  );
};
