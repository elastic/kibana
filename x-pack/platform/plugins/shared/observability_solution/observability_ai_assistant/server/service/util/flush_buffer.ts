/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { repeat } from 'lodash';
import { Observable, OperatorFunction } from 'rxjs';
import {
  BufferFlushEvent,
  StreamingChatResponseEventType,
  StreamingChatResponseEventWithoutError,
  TokenCountEvent,
} from '../../../common/conversation_complete';

// The Cloud proxy currently buffers 4kb or 8kb of data until flushing.
// This decreases the responsiveness of the streamed response,
// so we manually insert some data every 250ms if needed to force it
// to flush.

export function flushBuffer<T extends StreamingChatResponseEventWithoutError | TokenCountEvent>(
  isCloud: boolean
): OperatorFunction<T, T | BufferFlushEvent> {
  return (source: Observable<T>) =>
    new Observable<T | BufferFlushEvent>((subscriber) => {
      const cloudProxyBufferSize = 4096;
      let currentBufferSize: number = 0;

      const flushBufferIfNeeded = () => {
        if (currentBufferSize && currentBufferSize <= cloudProxyBufferSize) {
          subscriber.next({
            data: repeat('0', cloudProxyBufferSize * 2),
            type: StreamingChatResponseEventType.BufferFlush,
          });
          currentBufferSize = 0;
        }
      };

      const keepAlive = () => {
        subscriber.next({
          data: '0',
          type: StreamingChatResponseEventType.BufferFlush,
        });
      };

      const flushIntervalId = isCloud ? setInterval(flushBufferIfNeeded, 250) : undefined;
      const keepAliveIntervalId = setInterval(keepAlive, 30_000);

      source.subscribe({
        next: (value) => {
          currentBufferSize =
            currentBufferSize <= cloudProxyBufferSize
              ? JSON.stringify(value).length + currentBufferSize
              : cloudProxyBufferSize;
          subscriber.next(value);
        },
        error: (error) => {
          clearInterval(flushIntervalId);
          clearInterval(keepAliveIntervalId);
          subscriber.error(error);
        },
        complete: () => {
          clearInterval(flushIntervalId);
          clearInterval(keepAliveIntervalId);
          subscriber.complete();
        },
      });
    });
}
