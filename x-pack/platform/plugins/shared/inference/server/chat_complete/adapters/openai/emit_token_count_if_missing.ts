/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { OperatorFunction } from 'rxjs';
import { Observable } from 'rxjs';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { isChatCompletionTokenCountEvent, isChatCompletionChunkEvent } from '@kbn/inference-common';
import type { OpenAIRequest } from './types';

/**
 * Operator mirroring the source and then emitting a tokenCount event when the source completes,
 * if and only if the source did not emit a tokenCount event itself.
 *
 * This is used to manually count tokens and emit the associated event for
 * providers that don't support sending token counts for the stream API.
 *
 * @param request the OpenAI request that was sent to the connector.
 * @param logger optional logger for warnings when token counting fails.
 */
export function emitTokenCountEstimateIfMissing({
  request,
  logger,
}: {
  request: OpenAIRequest;
  logger?: Logger;
}): OperatorFunction<
  ChatCompletionChunkEvent | ChatCompletionTokenCountEvent,
  ChatCompletionChunkEvent | ChatCompletionTokenCountEvent
> {
  return (source$) => {
    let tokenCountEmitted = false;
    const chunks: ChatCompletionChunkEvent[] = [];

    return new Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>(
      (subscriber) => {
        return source$.subscribe({
          next: (value) => {
            if (isChatCompletionTokenCountEvent(value)) {
              tokenCountEmitted = true;
            } else if (isChatCompletionChunkEvent(value)) {
              chunks.push(value);
            }
            subscriber.next(value);
          },
          error: (err) => {
            subscriber.error(err);
          },
          complete: () => {
            if (!tokenCountEmitted) {
              import('./manually_count_tokens')
                .then(({ manuallyCountTokens }) => {
                  subscriber.next(manuallyCountTokens(request, chunks));
                  subscriber.complete();
                })
                .catch((err) => {
                  // Intentionally broad: token counting must never crash the chat stream.
                  logger?.warn('Failed to manually count tokens, skipping token count event', {
                    error: err,
                  });
                  subscriber.complete();
                });
            } else {
              subscriber.complete();
            }
          },
        });
      }
    );
  };
}
