/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatCompleteRequestBody } from '@kbn/inference-plugin/common';
import {
  BoundChatCompleteAPI,
  ChatCompleteResponse,
  ChatCompletionEvent,
  UnboundChatCompleteOptions,
} from '@kbn/inference-common';
import { defer, from } from 'rxjs';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { InferenceCliClientOptions } from './types';
import { combineSignal } from './combine_signal';

export function createChatComplete(options: InferenceCliClientOptions): BoundChatCompleteAPI;

export function createChatComplete({ connector, kibanaClient, signal }: InferenceCliClientOptions) {
  return (options: UnboundChatCompleteOptions) => {
    const {
      messages,
      abortSignal,
      maxRetries,
      metadata: _metadata,
      modelName,
      retryConfiguration,
      stream,
      system,
      temperature,
      toolChoice,
      tools,
    } = options;

    const body: ChatCompleteRequestBody = {
      connectorId: connector.connectorId,
      messages,
      modelName,
      system,
      temperature,
      toolChoice,
      tools,
      maxRetries,
      retryConfiguration:
        retryConfiguration && typeof retryConfiguration.retryOn === 'string'
          ? {
              retryOn: retryConfiguration.retryOn,
            }
          : undefined,
    };

    if (stream) {
      return defer(() => {
        return from(
          kibanaClient
            .fetch(`/internal/inference/chat_complete/stream`, {
              method: 'POST',
              body,
              asRawResponse: true,
              signal: combineSignal(signal, abortSignal),
            })
            .then((response) => ({ response }))
        );
      }).pipe(httpResponseIntoObservable<ChatCompletionEvent>());
    }

    return kibanaClient.fetch<ChatCompleteResponse>(`/internal/inference/chat_complete`, {
      method: 'POST',
      body,
      signal: combineSignal(signal, abortSignal),
    });
  };
}
