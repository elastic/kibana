/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  APIReturnType,
  StreamsAPIClientRequestParamsOf,
  StreamsRepositoryClient,
} from '@kbn/streams-plugin/public/api';
import { isHttpFetchError } from '@kbn/server-route-repository-client';

const PIPELINE_SUGGESTION_TASK_ENDPOINT =
  'POST /internal/streams/{name}/_pipeline_suggestion/_task' as const;

const PIPELINE_SUGGESTION_STATUS_ENDPOINT =
  'GET /internal/streams/{name}/_pipeline_suggestion/_status' as const;

/** HTTP 409 while a prior cancel is still in progress — retry schedule after this delay. */
export const PIPELINE_SUGGESTION_SCHEDULE_CONFLICT_RETRY_INTERVAL_MS = 1000;

/**
 * Max retries when scheduling hits 409 (cancellation in progress).
 * Attempts = this value + 1 (initial try + retries).
 */
export const PIPELINE_SUGGESTION_SCHEDULE_CONFLICT_MAX_RETRIES = 10;

type PipelineSuggestionTaskRequestParams = StreamsAPIClientRequestParamsOf<
  typeof PIPELINE_SUGGESTION_TASK_ENDPOINT
>;

export type PipelineSuggestionScheduleBody = Extract<
  PipelineSuggestionTaskRequestParams['params']['body'],
  { action: 'schedule' }
>;

export type PipelineSuggestionTaskMutationBody = Exclude<
  PipelineSuggestionTaskRequestParams['params']['body'],
  PipelineSuggestionScheduleBody
>;

export type PipelineSuggestionTaskStatusResult = APIReturnType<
  typeof PIPELINE_SUGGESTION_STATUS_ENDPOINT
>;

/**
 * POST schedule with retries when the server returns 409 (task cancellation still in progress).
 */
export async function postSchedulePipelineSuggestionTaskWithConflictRetry(
  streamsRepositoryClient: StreamsRepositoryClient,
  args: {
    streamName: string;
    signal: AbortSignal | null;
    body: PipelineSuggestionScheduleBody;
    maxConflictRetries?: number;
  }
): Promise<APIReturnType<typeof PIPELINE_SUGGESTION_TASK_ENDPOINT>> {
  const maxRetries = args.maxConflictRetries ?? PIPELINE_SUGGESTION_SCHEDULE_CONFLICT_MAX_RETRIES;
  const retryIntervalMs = PIPELINE_SUGGESTION_SCHEDULE_CONFLICT_RETRY_INTERVAL_MS;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await streamsRepositoryClient.fetch(PIPELINE_SUGGESTION_TASK_ENDPOINT, {
        signal: args.signal,
        params: {
          path: { name: args.streamName },
          body: args.body,
        },
      });
    } catch (error) {
      const isCancellationInProgress = isHttpFetchError(error) && error.response?.status === 409;
      if (isCancellationInProgress && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
        continue;
      }
      throw error;
    }
  }

  throw new Error('postSchedulePipelineSuggestionTaskWithConflictRetry: exhausted retries');
}

export async function getPipelineSuggestionTaskStatus(
  streamsRepositoryClient: StreamsRepositoryClient,
  args: { streamName: string; signal: AbortSignal | null }
): Promise<PipelineSuggestionTaskStatusResult> {
  return streamsRepositoryClient.fetch(PIPELINE_SUGGESTION_STATUS_ENDPOINT, {
    signal: args.signal,
    params: {
      path: { name: args.streamName },
    },
  });
}

export async function postPipelineSuggestionTask(
  streamsRepositoryClient: StreamsRepositoryClient,
  args: {
    streamName: string;
    signal: AbortSignal | null;
    body: PipelineSuggestionTaskMutationBody;
  }
): Promise<APIReturnType<typeof PIPELINE_SUGGESTION_TASK_ENDPOINT>> {
  return streamsRepositoryClient.fetch(PIPELINE_SUGGESTION_TASK_ENDPOINT, {
    signal: args.signal,
    params: {
      path: { name: args.streamName },
      body: args.body,
    },
  });
}

export async function postPipelineSuggestionTaskByAction(
  streamsRepositoryClient: StreamsRepositoryClient,
  args: {
    streamName: string;
    signal: AbortSignal | null;
    action: PipelineSuggestionTaskMutationBody['action'];
  }
): Promise<APIReturnType<typeof PIPELINE_SUGGESTION_TASK_ENDPOINT>> {
  return postPipelineSuggestionTask(streamsRepositoryClient, {
    streamName: args.streamName,
    signal: args.signal,
    body: { action: args.action },
  });
}
