/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { PassThrough } from 'stream';
import {
  BufferFlushEvent,
  ChatCompletionErrorEvent,
  isChatCompletionError,
  StreamingChatResponseEventType,
  StreamingChatResponseEventWithoutError,
} from '../../../common/conversation_complete';

export function observableIntoStream(
  source: Observable<StreamingChatResponseEventWithoutError | BufferFlushEvent>
) {
  const stream = new PassThrough();

  source.subscribe({
    next: (event) => {
      stream.write(JSON.stringify(event) + '\n');
    },
    error: (error) => {
      const errorEvent: ChatCompletionErrorEvent = {
        error: {
          message: error.message,
          stack: error.stack,
          code: isChatCompletionError(error) ? error.code : undefined,
          meta: error.meta,
        },
        type: StreamingChatResponseEventType.ChatCompletionError,
      };
      stream.write(JSON.stringify(errorEvent) + '\n');
      stream.end();
    },
    complete: () => {
      stream.end();
    },
  });

  return stream;
}
