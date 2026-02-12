/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromPromise } from 'xstate5';
import type { IToasts, NotificationsStart } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { streamlangDSLSchema, type StreamlangDSL } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import { TaskStatus, type TaskResult } from '@kbn/streams-schema';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import {
  extractGrokPatternDangerouslySlow,
  groupMessagesByPattern as groupMessagesByGrokPattern,
} from '@kbn/grok-heuristics';

import { i18n } from '@kbn/i18n';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import { getFormattedError } from '../../../../../util/errors';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import { isNoSuggestionsError } from '../../steps/blocks/action/utils/no_suggestions_error';
import { PRIORITIZED_CONTENT_FIELDS, getDefaultTextField } from '../../utils';
import { extractMessagesFromField } from '../../steps/blocks/action/utils/pattern_suggestion_helpers';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine/types';

export interface SuggestPipelineInput {
  streamName: string;
  connectorId: string;
  documents: SampleDocumentWithUIAttributes[];
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

export async function schedulePipelineSuggestionTaskLogic(input: SuggestPipelineInput): Promise<void> {
  const { streamName, connectorId, signal, streamsRepositoryClient } = input;

  // Extract FlattenRecord documents from SampleDocumentWithUIAttributes
  const documents: FlattenRecord[] = input.documents.map(
    (doc) => flattenObjectNestedLast(doc.document) as FlattenRecord
  );

  // CLIENT-SIDE - Extract patterns from documents
  const fieldName = getDefaultTextField(documents, PRIORITIZED_CONTENT_FIELDS);
  const messages = extractMessagesFromField(documents, fieldName);

  // Only grok extraction is CPU-intensive enough to warrant client-side processing
  const grokPatterns = await extractGrokPatternsClientSide(messages, fieldName);

  // Schedule background task for server-side processing
  const extractedPatterns = {
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
  };

  await streamsRepositoryClient.fetch('POST /internal/streams/{name}/_pipeline_suggestion/_task', {
    signal,
    params: {
      path: { name: streamName },
      body: {
        action: 'schedule' as const,
        connectorId,
        documents,
        extractedPatterns,
      },
    },
  });
}

// --- Schedule Suggestion Task Actor ---

export interface SchedulePipelineSuggestionTaskInputMinimal {
  streamName: string;
  connectorId: string;
  documents: SampleDocumentWithUIAttributes[];
}

export const createSchedulePipelineSuggestionTaskActor = ({
  streamsRepositoryClient,
  telemetryClient,
  notifications,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  telemetryClient: StreamsTelemetryClient;
  notifications: NotificationsStart;
}) => {
  return fromPromise<void, SchedulePipelineSuggestionTaskInputMinimal>(async ({ input, signal }) =>
    schedulePipelineSuggestionTaskLogic({
      ...input,
      signal,
      streamsRepositoryClient,
      telemetryClient,
      notifications,
    })
  );
};

// --- Get Suggestion Status Actor ---

type PipelineSuggestionStatusPayload = { pipeline: unknown | null };
export type PipelineSuggestionTaskStatusResult = TaskResult<PipelineSuggestionStatusPayload>;

export interface GetPipelineSuggestionStatusInputMinimal {
  streamName: string;
}

export async function getPipelineSuggestionStatusLogic({
  streamName,
  signal,
  streamsRepositoryClient,
}: {
  streamName: string;
  signal: AbortSignal;
  streamsRepositoryClient: StreamsRepositoryClient;
}): Promise<PipelineSuggestionTaskStatusResult> {
  return await streamsRepositoryClient.fetch(
    'POST /internal/streams/{name}/_pipeline_suggestion/_status',
    {
      signal,
      params: {
        path: { name: streamName },
      },
    }
  );
}

export const createGetPipelineSuggestionStatusActor = ({
  streamsRepositoryClient,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
}) => {
  return fromPromise<PipelineSuggestionTaskStatusResult, GetPipelineSuggestionStatusInputMinimal>(
    async ({ input, signal }) =>
      getPipelineSuggestionStatusLogic({
        streamName: input.streamName,
        signal,
        streamsRepositoryClient,
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

    // Don't show toast for abort errors - they're expected when user cancels or switches streams
    if (isRequestAbortedError(event.error)) {
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

// --- Load Existing Suggestion Actor ---

/**
 * Input for loading existing suggestion from task status
 */
export interface LoadExistingSuggestionInputMinimal {
  streamName: string;
}

export interface LoadExistingSuggestionInput extends LoadExistingSuggestionInputMinimal {
  signal: AbortSignal;
  streamsRepositoryClient: StreamsRepositoryClient;
}

/**
 * Result from loading existing suggestion
 */
export type LoadExistingSuggestionResult =
  | { type: 'completed'; pipeline: StreamlangDSL }
  | { type: 'in_progress' }
  | { type: 'failed'; error: string }
  | { type: 'none' };

/**
 * Load existing pipeline suggestion state from the task status endpoint.
 * - If completed: returns the pipeline
 * - If in_progress: returns in_progress (caller can decide whether to poll)
 * - If failed/stale/not_started: returns appropriate state
 */
export async function loadExistingSuggestionLogic(
  input: LoadExistingSuggestionInput
): Promise<LoadExistingSuggestionResult> {
  const { streamName, signal, streamsRepositoryClient } = input;

  const getStatus = async () => {
    return streamsRepositoryClient.fetch(
      'POST /internal/streams/{name}/_pipeline_suggestion/_status',
      {
        signal,
        params: {
          path: { name: streamName },
        },
      }
    );
  };

  let taskResult;
  try {
    taskResult = await getStatus();
  } catch (error) {
    // If aborted during initial fetch, return 'none' gracefully
    if (isRequestAbortedError(error)) {
      return { type: 'none' };
    }
    throw error;
  }

  if (
    taskResult.status === TaskStatus.InProgress ||
    taskResult.status === TaskStatus.BeingCanceled
  ) {
    return { type: 'in_progress' };
  }

  // Handle terminal states
  switch (taskResult.status) {
    case TaskStatus.Completed:
      // Only show suggestions for completed (not yet acknowledged) tasks
      if (taskResult.pipeline) {
        return {
          type: 'completed',
          pipeline: streamlangDSLSchema.parse(taskResult.pipeline),
        };
      }
      // Task completed but no pipeline (NoSuggestionsError case)
      return { type: 'none' };

    case TaskStatus.Failed:
      return { type: 'failed', error: taskResult.error };

    case TaskStatus.Acknowledged:
      // Acknowledged tasks have already been accepted/rejected/dismissed - don't show again
      return { type: 'none' };

    case TaskStatus.NotStarted:
    case TaskStatus.Stale:
    case TaskStatus.Canceled:
    default:
      return { type: 'none' };
  }
}

/**
 * Actor factory for loading existing suggestion state.
 * Used on mount to restore previous suggestion state.
 */
export const createLoadExistingSuggestionActor = ({
  streamsRepositoryClient,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
}) => {
  return fromPromise<LoadExistingSuggestionResult, LoadExistingSuggestionInputMinimal>(
    async ({ input, signal }) =>
      loadExistingSuggestionLogic({
        ...input,
        signal,
        streamsRepositoryClient,
      })
  );
};
