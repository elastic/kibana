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
import { TaskStatus } from '@kbn/streams-schema';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import {
  extractGrokPatternDangerouslySlow,
  groupMessagesByPattern as groupMessagesByGrokPattern,
} from '@kbn/grok-heuristics';

import { i18n } from '@kbn/i18n';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import { getFormattedError } from '../../../../../util/errors';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import {
  NoSuggestionsError,
  isNoSuggestionsError,
} from '../../steps/blocks/action/utils/no_suggestions_error';
import { PRIORITIZED_CONTENT_FIELDS, getDefaultTextField } from '../../utils';
import { extractMessagesFromField } from '../../steps/blocks/action/utils/pattern_suggestion_helpers';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine/types';

const POLLING_INTERVAL_MS = 2000;
const MAX_POLLING_TIME_MS = 5 * 60 * 1000; // 5 minutes

class PollingAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PollingAbortedError';
  }
}

class PollingTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PollingTimeoutError';
  }
}

const pollWithTimeout = async <T>({
  signal,
  getNext,
  shouldContinue,
  intervalMs,
  timeoutMs,
  createAbortError,
  createTimeoutError,
}: {
  signal: AbortSignal;
  getNext: () => Promise<T>;
  shouldContinue: (value: T) => boolean;
  intervalMs: number;
  timeoutMs: number;
  createAbortError: () => Error;
  createTimeoutError: () => Error;
}): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let settled = false;

  const clearTimer = () => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  return await new Promise<T>((resolve, reject) => {
    const settleReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      clearTimer();
      signal.removeEventListener('abort', onAbort);
      reject(error);
    };

    const settleResolve = (value: T) => {
      if (settled) return;
      settled = true;
      clearTimer();
      signal.removeEventListener('abort', onAbort);
      resolve(value);
    };

    const onAbort = () => {
      settleReject(createAbortError());
    };

    const poll = async (): Promise<void> => {
      if (settled) return;

      if (signal.aborted) {
        settleReject(createAbortError());
        return;
      }

      if (Date.now() > deadline) {
        settleReject(createTimeoutError());
        return;
      }

      let next: T;
      try {
        next = await getNext();
      } catch (error) {
        if (isRequestAbortedError(error)) {
          settleReject(createAbortError());
          return;
        }
        settleReject(error);
        return;
      }

      if (!shouldContinue(next)) {
        settleResolve(next);
        return;
      }

      if (Date.now() > deadline) {
        settleReject(createTimeoutError());
        return;
      }

      timerId = setTimeout(() => {
        void poll();
      }, intervalMs);
    };

    signal.addEventListener('abort', onAbort, { once: true });
    void poll();
  });
};

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
  const { streamName, connectorId, signal, streamsRepositoryClient } = input;

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

  // Step 2: Schedule background task for server-side processing
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

  // Step 3: Poll for task completion
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

  const taskResult = await pollWithTimeout({
    signal,
    getNext: getStatus,
    shouldContinue: (result) =>
      result.status === TaskStatus.InProgress || result.status === TaskStatus.NotStarted,
    intervalMs: POLLING_INTERVAL_MS,
    timeoutMs: MAX_POLLING_TIME_MS,
    createAbortError: () => new PollingAbortedError('Pipeline suggestion was cancelled'),
    createTimeoutError: () => new PollingTimeoutError('Pipeline suggestion timed out'),
  });

  // Step 4: Handle terminal states
  switch (taskResult.status) {
    case TaskStatus.Completed:
      if (taskResult.pipeline) {
        return streamlangDSLSchema.parse(taskResult.pipeline);
      }
      // Task completed but no pipeline (NoSuggestionsError case from server)
      throw new NoSuggestionsError(
        i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.noSuggestionsError',
          {
            defaultMessage: 'Could not generate suggestions',
          }
        )
      );

    case TaskStatus.Acknowledged:
      // Task was acknowledged from another session - treat as already handled
      throw new NoSuggestionsError(
        i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.suggestionAlreadyHandled',
          {
            defaultMessage: 'This suggestion was already handled',
          }
        )
      );

    case TaskStatus.Failed:
      throw new Error(taskResult.error || 'Pipeline suggestion failed');

    case TaskStatus.Canceled:
    case TaskStatus.BeingCanceled:
      throw new Error('Pipeline suggestion was cancelled');

    case TaskStatus.Stale:
      throw new Error('Pipeline suggestion task became stale');

    default:
      throw new Error(`Unexpected task status: ${taskResult.status}`);
  }
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

  if (taskResult.status === TaskStatus.InProgress || taskResult.status === TaskStatus.BeingCanceled) {
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

// --- Poll Existing Suggestion Actor ---

/**
 * Input for polling an existing in-progress suggestion task.
 */
export interface PollExistingSuggestionInputMinimal {
  streamName: string;
}

export interface PollExistingSuggestionInput extends PollExistingSuggestionInputMinimal {
  signal: AbortSignal;
  streamsRepositoryClient: StreamsRepositoryClient;
}

/**
 * Result from polling an existing suggestion task.
 */
export type PollExistingSuggestionResult =
  | { type: 'completed'; pipeline: StreamlangDSL }
  | { type: 'none' };

/**
 * Poll the task status endpoint until the existing task completes or transitions to a terminal state.
 * This is used when the initial status check reported an in-progress task.
 */
export async function pollExistingSuggestionLogic(
  input: PollExistingSuggestionInput
): Promise<PollExistingSuggestionResult> {
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
    taskResult = await pollWithTimeout({
      signal,
      getNext: getStatus,
      shouldContinue: (result) =>
        result.status === TaskStatus.InProgress || result.status === TaskStatus.BeingCanceled,
      intervalMs: POLLING_INTERVAL_MS,
      timeoutMs: MAX_POLLING_TIME_MS,
      createAbortError: () => new PollingAbortedError('Polling was cancelled'),
      createTimeoutError: () => new PollingTimeoutError('Polling timed out'),
    });
  } catch (error) {
    if (error instanceof PollingAbortedError || error instanceof PollingTimeoutError) {
      return { type: 'none' };
    }
    throw error;
  }

  switch (taskResult.status) {
    case TaskStatus.Completed:
      if (taskResult.pipeline) {
        return {
          type: 'completed',
          pipeline: streamlangDSLSchema.parse(taskResult.pipeline),
        };
      }
      return { type: 'none' };

    case TaskStatus.Acknowledged:
    case TaskStatus.NotStarted:
    case TaskStatus.Stale:
    case TaskStatus.Canceled:
    case TaskStatus.Failed:
    default:
      return { type: 'none' };
  }
}

/**
 * Actor factory for polling an existing suggestion state.
 * Used when the initial status check reported an in-progress task.
 */
export const createPollExistingSuggestionActor = ({
  streamsRepositoryClient,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
}) => {
  return fromPromise<PollExistingSuggestionResult, PollExistingSuggestionInputMinimal>(
    async ({ input, signal }) =>
      pollExistingSuggestionLogic({
        ...input,
        signal,
        streamsRepositoryClient,
      })
  );
};
