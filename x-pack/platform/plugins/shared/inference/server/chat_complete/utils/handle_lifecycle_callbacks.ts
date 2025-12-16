/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperatorFunction } from 'rxjs';
import { Observable } from 'rxjs';
import type { ChatCompletionEvent, ChatCompletionTokenCount } from '@kbn/inference-common';
import { isChatCompletionTokenCountEvent } from '@kbn/inference-common';
import type { InferenceCallbackManager } from '../../inference_client/callback_manager';

export function handleLifecycleCallbacks({
  callbackManager,
}: {
  callbackManager: InferenceCallbackManager;
}): OperatorFunction<ChatCompletionEvent, ChatCompletionEvent> {
  return (source$) => {
    let tokenCount: ChatCompletionTokenCount | undefined;
    let model: string | undefined;

    return new Observable<ChatCompletionEvent>((subscriber) => {
      return source$.subscribe({
        next: (value) => {
          if (isChatCompletionTokenCountEvent(value)) {
            tokenCount = value.tokens;
            if (value.model) {
              model = value.model;
            }
          }
          subscriber.next(value);
        },
        error: (err) => {
          callbackManager.onError({
            error: err,
          });
          subscriber.error(err);
        },
        complete: () => {
          callbackManager.onComplete({
            tokens: tokenCount,
            model,
          });
          subscriber.complete();
        },
      });
    });
  };
}
