/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, map } from 'rxjs';
import { fromPromise } from 'xstate';
import type { IToasts, NotificationsStart } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { streamlangDSLSchema, type StreamlangDSL } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import {
  extractGrokPatternDangerouslySlow,
  groupMessagesByPattern as groupMessagesByGrokPattern,
} from '@kbn/grok-heuristics';

import { i18n } from '@kbn/i18n';
import { getFormattedError } from '../../../../../util/errors';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import {
  NoSuggestionsError,
  isNoSuggestionsError,
} from '../../steps/blocks/action/utils/no_suggestions_error';
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

type GrokPatternNode = { pattern: string } | { id: string; component: string; values: string[] };

interface ExtractedGrokPattern {
  type: 'grok';
  fieldName: string;
  patternGroups: Array<{
    messages: string[];
    nodes: GrokPatternNode[];
  }>;
}

export async function suggestPipelineLogic(input: SuggestPipelineInput): Promise<StreamlangDSL> {
  // Extract FlattenRecord documents from SampleDocumentWithUIAttributes
  const documents: FlattenRecord[] = input.documents.map(
    (doc) => flattenObjectNestedLast(doc.document) as FlattenRecord
  );

  // Step 1: CLIENT-SIDE - Extract patterns from documents
  // This is compute-intensive and synchronous, so it stays client-side
  const fieldName = getDefaultTextField(documents, PRIORITIZED_CONTENT_FIELDS);
  const messages = extractMessagesFromField(documents, fieldName);

  // Only grok extraction is CPU-intensive enough to warrant client-side processing
  const grokPatterns = await extractGrokPatternsClientSide(messages, fieldName);

  // Step 2: SERVER-SIDE - Pass extracted grok patterns and raw messages to server for:
  // - Dissect pattern extraction (cheap, can run server-side)
  // - LLM review of patterns
  // - Simulation to pick best processor
  // - Full pipeline generation
  const pipeline = await lastValueFrom(
    input.streamsRepositoryClient
      .stream('POST /internal/streams/{name}/_suggest_processing_pipeline', {
        signal: input.signal,
        params: {
          path: { name: input.streamName },
          body: {
            connector_id: input.connectorId,
            documents,
            extracted_patterns: {
              grok: grokPatterns
                ? {
                    fieldName: grokPatterns.fieldName,
                    patternGroups: grokPatterns.patternGroups,
                  }
                : null,
              dissect:
                messages.length > 0
                  ? {
                      fieldName,
                      messages,
                    }
                  : null,
            },
          },
        },
      })
      .pipe(
        map((event) => {
          // Handle case where LLM couldn't generate suggestions
          if (event.pipeline === null) {
            throw new NoSuggestionsError(
              i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.noSuggestionsError',
                {
                  defaultMessage: 'Could not generate suggestions',
                }
              )
            );
          }
          return streamlangDSLSchema.parse(event.pipeline);
        })
      )
  );

  return pipeline;
}

/**
 * CLIENT-SIDE: Extract grok patterns from messages
 * This is compute-intensive pattern matching that should stay client-side
 */
async function extractGrokPatternsClientSide(
  messages: string[],
  fieldName: string
): Promise<ExtractedGrokPattern | null> {
  try {
    const groupedMessages = groupMessagesByGrokPattern(messages);

    if (groupedMessages.length === 0) {
      return null;
    }

    // Extract patterns for each message group
    const patternGroups = groupedMessages.map((group) => {
      const grokPatternNodes = extractGrokPatternDangerouslySlow(group.messages);
      return {
        messages: group.messages.slice(0, 10), // Limit to 10 samples per group
        nodes: grokPatternNodes as GrokPatternNode[], // forward full nodes with proper typing
      };
    });

    return {
      type: 'grok',
      fieldName,
      patternGroups,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Client-side grok pattern extraction failed:', error);
    return null;
  }
}

export const createSuggestPipelineActor = ({
  streamsRepositoryClient,
  telemetryClient,
  notifications,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  telemetryClient: StreamsTelemetryClient;
  notifications: NotificationsStart;
}) => {
  return fromPromise<StreamlangDSL, SuggestPipelineInputMinimal>(async ({ input, signal }) =>
    suggestPipelineLogic({
      ...input,
      signal,
      streamsRepositoryClient,
      telemetryClient,
      notifications,
    })
  );
};

export const createNotifySuggestionFailureNotifier =
  ({ toasts }: { toasts: IToasts }) =>
  (params: { event: unknown }) => {
    const event = params.event as { error: Error };

    // Don't show toast for NoSuggestionsError - UI will handle it inline
    if (isNoSuggestionsError(event.error)) {
      return;
    }

    const formattedError = getFormattedError(event.error);
    toasts.addError(formattedError, {
      title: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.suggestionError',
        { defaultMessage: 'Failed to generate pipeline suggestion' }
      ),
    });
  };
