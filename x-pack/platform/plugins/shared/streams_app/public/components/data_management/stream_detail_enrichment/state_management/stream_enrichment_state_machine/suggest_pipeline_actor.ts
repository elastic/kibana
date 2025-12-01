/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, map } from 'rxjs';
import { fromPromise } from 'xstate5';
import type { NotificationsStart } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { streamlangDSLSchema, type StreamlangDSL } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import {
  extractGrokPatternDangerouslySlow,
  groupMessagesByPattern as groupMessagesByGrokPattern,
} from '@kbn/grok-heuristics';
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

interface ExtractedGrokPattern {
  type: 'grok';
  fieldName: string;
  patternGroups: Array<{
    messages: string[];
    patterns: string[];
  }>;
}

interface ExtractedDissectPattern {
  type: 'dissect';
  fieldName: string;
  messages: string[];
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

  const [grokPatterns, dissectPatterns] = await Promise.all([
    extractGrokPatternsClientSide(messages, fieldName),
    extractDissectPatternsClientSide(messages, fieldName),
  ]);

  // Step 2: SERVER-SIDE - Pass extracted patterns to server for:
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
              grok: grokPatterns,
              dissect: dissectPatterns,
            },
          },
        },
      })
      .pipe(map((event) => streamlangDSLSchema.parse(event.pipeline)))
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
        patterns: grokPatternNodes
          .filter((node): node is { pattern: string } => 'pattern' in node)
          .map((node) => node.pattern),
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

/**
 * CLIENT-SIDE: Prepare dissect data for server-side processing
 * Just extract and group messages - pattern extraction happens server-side
 */
async function extractDissectPatternsClientSide(
  messages: string[],
  fieldName: string
): Promise<ExtractedDissectPattern | null> {
  try {
    // Just return the messages and fieldName - server will do the extraction
    if (messages.length === 0) {
      return null;
    }

    return {
      type: 'dissect',
      fieldName,
      messages: messages.slice(0, 10), // Limit to 10 samples
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Client-side dissect data preparation failed:', error);
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
