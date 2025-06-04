/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AssistantMessage,
  ChatCompletionEvent,
  MessageRole,
  RedactionEntity,
  RedactionOutput,
  withoutChunkEvents,
  withoutTokenCountEvents,
} from '@kbn/inference-common';
import {
  ChatCompletionEventType,
  ChatCompletionUnredactedMessageEvent,
} from '@kbn/inference-common/src/chat_complete/events';
import { OperatorFunction, identity, map } from 'rxjs';
import { unredact } from './unredact';

export function unredactMessage<
  T extends ChatCompletionEvent,
  U extends RedactionOutput | undefined
>({
  redaction,
}: {
  redaction?: U;
}): OperatorFunction<T, U extends RedactionOutput ? ChatCompletionUnredactedMessageEvent : T>;

export function unredactMessage({
  redaction,
}: {
  redaction?: RedactionOutput;
}): OperatorFunction<ChatCompletionEvent, ChatCompletionEvent> {
  if (!redaction) {
    return identity;
  }
  const redactionEntityLookup: Record<string, RedactionEntity> = {};

  redaction.redactions.forEach((item) => {
    redactionEntityLookup[item.entity.mask] = item.entity;
  });

  return (source$) => {
    return source$.pipe(
      withoutChunkEvents(),
      withoutTokenCountEvents(),
      map((messageEvent): ChatCompletionUnredactedMessageEvent => {
        const message = {
          content: messageEvent.content,
          toolCalls: messageEvent.toolCalls,
          role: MessageRole.Assistant,
        } satisfies AssistantMessage;

        const {
          message: { content, toolCalls },
          unredactions,
        } = unredact(message, redactionEntityLookup);

        return {
          content,
          toolCalls,
          type: ChatCompletionEventType.ChatCompletionUnredactedMessage,
          unredaction: {
            messages: redaction.messages
              .map((msg) => {
                const unredaction = unredact(msg, redactionEntityLookup);

                return {
                  ...unredaction.message,
                  unredactions: unredaction.unredactions,
                };
              })
              .concat({
                ...message,
                unredactions,
              }),
          },
        };
      })
    );
  };
}
