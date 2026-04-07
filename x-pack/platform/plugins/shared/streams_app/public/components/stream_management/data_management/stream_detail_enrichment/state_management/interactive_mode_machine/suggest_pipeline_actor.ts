/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromPromise } from 'xstate';
import type { IToasts, NotificationsStart } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { streamlangDSLSchema, type StreamlangDSL } from '@kbn/streamlang';
import type { FlattenRecord } from '@kbn/streams-schema';
import { TaskStatus } from '@kbn/streams-schema';
import { flattenObjectNestedLast } from '@kbn/object-utils';

import { i18n } from '@kbn/i18n';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import { getFormattedError } from '../../../../../../util/errors';
import type { StreamsTelemetryClient } from '../../../../../../telemetry/client';
import { isNoSuggestionsError } from '../../steps/blocks/action/utils/no_suggestions_error';
import { PRIORITIZED_CONTENT_FIELDS, getDefaultTextField } from '../../utils';
import { extractMessagesFromField } from '../../steps/blocks/action/utils/pattern_suggestion_helpers';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine/types';
import {
  getPipelineSuggestionTaskStatus,
  postSchedulePipelineSuggestionTaskWithConflictRetry,
  type PipelineSuggestionTaskStatusResult,
} from '../../../../../../lib/pipeline_suggestion_repository';

export type { PipelineSuggestionTaskStatusResult };

export interface SuggestPipelineInput {
  streamName: string;
  connectorId: string;
  documents: SampleDocumentWithUIAttributes[];
  signal: AbortSignal;
  streamsRepositoryClient: StreamsRepositoryClient;
  telemetryClient: StreamsTelemetryClient;
  notifications: NotificationsStart;
}

export async function schedulePipelineSuggestionTaskLogic(
  input: SuggestPipelineInput
): Promise<void> {
  const { streamName, connectorId, signal, streamsRepositoryClient } = input;

  // Extract FlattenRecord documents from SampleDocumentWithUIAttributes
  const documents: FlattenRecord[] = input.documents.map(
    (doc) => flattenObjectNestedLast(doc.document) as FlattenRecord
  );

  // Determine field name and extract messages
  const fieldName = getDefaultTextField(documents, PRIORITIZED_CONTENT_FIELDS);
  const messages = extractMessagesFromField(documents, fieldName);

  await postSchedulePipelineSuggestionTaskWithConflictRetry(streamsRepositoryClient, {
    streamName,
    signal,
    body: {
      action: 'schedule',
      connectorId,
      documents,
      fieldName,
      sampleMessages: messages,
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
  return getPipelineSuggestionTaskStatus(streamsRepositoryClient, {
    streamName,
    signal,
  });
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
  (_: unknown, params: { event: unknown }) => {
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
  | { type: 'being_canceled' }
  | { type: 'failed'; error: string }
  | { type: 'no_suggestions' }
  | { type: 'none' };

/**
 * Load existing pipeline suggestion state from the task status endpoint.
 * - If completed: returns the pipeline
 * - If in_progress: returns in_progress (caller can decide whether to poll)
 * - If stale: same as in_progress (still marked running server-side; keep polling)
 * - If failed/not_started: returns appropriate state
 */
export async function loadExistingSuggestionLogic(
  input: LoadExistingSuggestionInput
): Promise<LoadExistingSuggestionResult> {
  const { streamName, signal, streamsRepositoryClient } = input;

  let taskResult;
  try {
    taskResult = await getPipelineSuggestionTaskStatus(streamsRepositoryClient, {
      streamName,
      signal,
    });
  } catch (error) {
    // If aborted during initial fetch, return 'none' gracefully
    if (isRequestAbortedError(error)) {
      return { type: 'none' };
    }
    throw error;
  }

  if (taskResult.status === TaskStatus.InProgress || taskResult.status === TaskStatus.Stale) {
    return { type: 'in_progress' };
  }

  // BeingCanceled is a transitional state - the task is being canceled but not yet fully canceled.
  // We return a distinct type so the UI can handle this appropriately (e.g., not show loading screen).
  if (taskResult.status === TaskStatus.BeingCanceled) {
    return { type: 'being_canceled' };
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
      return { type: 'no_suggestions' };

    case TaskStatus.Failed:
      return { type: 'failed', error: taskResult.error };

    case TaskStatus.Acknowledged:
      // Acknowledged tasks have already been accepted/rejected/dismissed - don't show again
      return { type: 'none' };

    case TaskStatus.NotStarted:
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
