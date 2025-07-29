/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  concat,
  from,
  last,
  mergeMap,
  Observable,
  OperatorFunction,
  shareReplay,
  withLatestFrom,
  filter,
} from 'rxjs';
import {
  type ChatCompletionChunkEvent,
  ChatEvent,
  MessageAddEvent,
  StreamingChatResponseEventType,
  StreamingChatResponseEvent,
} from '../conversation_complete';
import {
  concatenateChatCompletionChunks,
  ConcatenatedMessage,
} from './concatenate_chat_completion_chunks';

type ConcatenateMessageCallback = (
  concatenatedMessage: ConcatenatedMessage
) => Promise<ConcatenatedMessage>;

function mergeWithEditedMessage(
  originalMessage: ConcatenatedMessage,
  chunkEvent: ChatCompletionChunkEvent,
  callback?: ConcatenateMessageCallback
): Observable<MessageAddEvent> {
  return from(
    (callback ? callback(originalMessage) : Promise.resolve(originalMessage)).then((message) => {
      const next: MessageAddEvent = {
        type: StreamingChatResponseEventType.MessageAdd as const,
        id: chunkEvent.id,
        message: {
          '@timestamp': new Date().toISOString(),
          ...message,
        },
        // Preserve deanonymization data if present in the chunk event
        ...(chunkEvent.deanonymized_input && { deanonymized_input: chunkEvent.deanonymized_input }),
        ...(chunkEvent.deanonymized_output && {
          deanonymized_output: chunkEvent.deanonymized_output,
        }),
      };
      return next;
    })
  );
}

function filterChunkEvents(): OperatorFunction<
  StreamingChatResponseEvent,
  ChatCompletionChunkEvent
> {
  return filter(
    (event): event is ChatCompletionChunkEvent =>
      event.type === StreamingChatResponseEventType.ChatCompletionChunk
  );
}

export function emitWithConcatenatedMessage<T extends ChatEvent>(
  callback?: ConcatenateMessageCallback
): OperatorFunction<T, T | MessageAddEvent> {
  return (source$) => {
    const shared = source$.pipe(shareReplay());

    const response$ = concat(
      shared,
      shared.pipe(
        concatenateChatCompletionChunks(),
        last(),
        withLatestFrom(shared.pipe(filterChunkEvents())),
        mergeMap(([message, chunkEvent]) => {
          return mergeWithEditedMessage(message, chunkEvent, callback);
        })
      )
    );

    return response$;
  };
}
