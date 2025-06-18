/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BoundPromptAPI,
  ChatCompleteResponse,
  ChatCompletionEvent,
  PromptOptions,
  ToolOptionsOfPrompt,
  UnboundPromptOptions,
} from '@kbn/inference-common';
import { PromptRequestBody } from '@kbn/inference-plugin/common';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { defer, from, throwError } from 'rxjs';
import { combineSignal } from './combine_signal';
import { InferenceCliClientOptions } from './types';

export function createPrompt(options: InferenceCliClientOptions): BoundPromptAPI;

export function createPrompt({ connector, kibanaClient, signal }: InferenceCliClientOptions) {
  return <TPromptOptions extends PromptOptions>(options: UnboundPromptOptions<TPromptOptions>) => {
    const {
      abortSignal,
      maxRetries,
      metadata: _metadata,
      modelName,
      retryConfiguration,
      stream,
      temperature,
      prompt: { input: inputSchema, ...prompt },
      input,
    } = options;

    const body: PromptRequestBody = {
      connectorId: connector.connectorId,
      modelName,
      temperature,
      maxRetries,
      retryConfiguration:
        retryConfiguration && typeof retryConfiguration.retryOn === 'string'
          ? {
              retryOn: retryConfiguration.retryOn,
            }
          : undefined,
      prompt,
      input,
    };

    const validationResult = inputSchema.safeParse(input);

    if (stream) {
      if (!validationResult.success) {
        return throwError(() => validationResult.error);
      }

      return defer(() => {
        return from(
          kibanaClient
            .fetch(`/internal/inference/prompt/stream`, {
              method: 'POST',
              body,
              asRawResponse: true,
              signal: combineSignal(signal, abortSignal),
            })
            .then((response) => ({ response }))
        );
      }).pipe(
        httpResponseIntoObservable<
          ChatCompletionEvent<ToolOptionsOfPrompt<TPromptOptions['prompt']>>
        >()
      );
    }

    if (!validationResult.success) {
      return Promise.reject(validationResult.error);
    }

    return kibanaClient.fetch<ChatCompleteResponse<ToolOptionsOfPrompt<TPromptOptions['prompt']>>>(
      `/internal/inference/prompt`,
      {
        method: 'POST',
        body,
        signal: combineSignal(signal, abortSignal),
      }
    );
  };
}
