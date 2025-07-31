/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatCompleteResponse,
  ChatCompletionEvent,
  PromptAPI,
  PromptOptions,
  ToolOptionsOfPrompt,
} from '@kbn/inference-common';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { defer, from, lastValueFrom, throwError } from 'rxjs';
import type { HttpHandler } from '@kbn/core/public';
import { PromptRequestBody } from '../http_apis';
import { retryWithExponentialBackoff } from '../utils/retry_with_exponential_backoff';
import { getRetryFilter } from '../utils/error_retry_filter';
import { combineSignal } from '../utils/combine_signal';

interface PublicInferenceClientCreateOptions {
  fetch: HttpHandler;
  signal?: AbortSignal;
}

export function createPromptRestApi(options: PublicInferenceClientCreateOptions): PromptAPI;

export function createPromptRestApi({ fetch, signal }: PublicInferenceClientCreateOptions) {
  return <TPromptOptions extends PromptOptions>(
    options: PromptOptions<TPromptOptions['prompt']>
  ) => {
    const {
      abortSignal,
      maxRetries,
      metadata,
      modelName,
      retryConfiguration,
      stream,
      temperature,
      prompt: { input: inputSchema, ...prompt },
      input,
      connectorId,
      functionCalling,
      prevMessages,
    } = options;

    const body: PromptRequestBody = {
      connectorId,
      functionCalling,
      modelName,
      temperature,
      maxRetries,
      retryConfiguration: undefined,
      prompt,
      input,
      prevMessages,
      metadata,
    };

    const validationResult = inputSchema.safeParse(input);

    function retry<T>() {
      return retryWithExponentialBackoff<T>({
        maxRetry: maxRetries,
        backoffMultiplier: retryConfiguration?.backoffMultiplier,
        errorFilter: getRetryFilter(retryConfiguration?.retryOn),
        initialDelay: retryConfiguration?.initialDelay,
      });
    }

    if (stream) {
      if (!validationResult.success) {
        return throwError(() => validationResult.error);
      }

      return defer(() => {
        return from(
          fetch(`/internal/inference/prompt/stream`, {
            method: 'POST',
            body: JSON.stringify(body),
            asResponse: true,
            rawResponse: true,
            signal: combineSignal(signal, abortSignal),
          }).then((response) => ({ response: response.response! }))
        );
      }).pipe(
        httpResponseIntoObservable<
          ChatCompletionEvent<ToolOptionsOfPrompt<TPromptOptions['prompt']>>
        >(),
        retry()
      );
    }

    if (!validationResult.success) {
      return Promise.reject(validationResult.error);
    }

    return lastValueFrom(
      defer(() => {
        return from(
          fetch<ChatCompleteResponse<ToolOptionsOfPrompt<TPromptOptions['prompt']>>>(
            `/internal/inference/prompt`,
            {
              method: 'POST',
              body: JSON.stringify(body),
              signal: combineSignal(signal, abortSignal),
            }
          )
        );
      }).pipe(retry())
    );
  };
}
