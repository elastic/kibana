/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import {
  ChatCompleteAPI,
  ChatCompleteCompositeResponse,
  ChatCompleteOptions,
  ChatCompleteResponse,
  ToolOptions,
} from '@kbn/inference-common';
import { defer, from, lastValueFrom } from 'rxjs';
import { ChatCompleteRequestBody } from '../http_apis';
import { retryWithExponentialBackoff } from '../utils/retry_with_exponential_backoff';
import { getRetryFilter } from '../utils/error_retry_filter';
import { combineSignal } from '../utils/combine_signal';
import { httpResponseIntoObservable } from '../utils/http_response_into_observable';

interface CreatePublicChatCompleteOptions {
  fetch: HttpHandler;
  signal?: AbortSignal;
}

export function createChatCompleteRestApi({
  fetch,
  signal,
}: {
  fetch: HttpHandler;
  signal?: AbortSignal;
}): ChatCompleteAPI;
export function createChatCompleteRestApi({ fetch, signal }: CreatePublicChatCompleteOptions) {
  return ({
    connectorId,
    messages,
    system,
    toolChoice,
    tools,
    temperature,
    modelName,
    functionCalling,
    stream,
    abortSignal,
    maxRetries,
    metadata,
    retryConfiguration,
  }: ChatCompleteOptions): ChatCompleteCompositeResponse => {
    const body: ChatCompleteRequestBody = {
      connectorId,
      system,
      messages,
      toolChoice,
      tools,
      temperature,
      modelName,
      functionCalling,
      retryConfiguration: undefined,
      maxRetries,
      metadata,
    };

    function retry<T>() {
      return retryWithExponentialBackoff<T>({
        maxRetry: maxRetries,
        backoffMultiplier: retryConfiguration?.backoffMultiplier,
        errorFilter: getRetryFilter(retryConfiguration?.retryOn),
        initialDelay: retryConfiguration?.initialDelay,
      });
    }

    if (stream) {
      return from(
        fetch('/internal/inference/chat_complete/stream', {
          method: 'POST',
          asResponse: true,
          rawResponse: true,
          body: JSON.stringify(body),
          signal: combineSignal(signal, abortSignal),
        })
      ).pipe(httpResponseIntoObservable(), retry());
    } else {
      return lastValueFrom(
        defer(() =>
          fetch<ChatCompleteResponse<ToolOptions<string>>>('/internal/inference/chat_complete', {
            method: 'POST',
            body: JSON.stringify(body),
            signal: combineSignal(signal, abortSignal),
          })
        ).pipe(retry())
      );
    }
  };
}
