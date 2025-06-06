/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { type Observable, scan, map, defaultIfEmpty, filter } from 'rxjs';
import type { ChatEvent } from '../conversation_complete';
import { StreamingChatResponseEventType } from '../conversation_complete';
import { MessageRole } from '../types';

export interface ConcatenatedMessage {
  message: {
    content: string;
    role: MessageRole;
    function_call: {
      name: string;
      arguments: string;
      trigger: MessageRole.Assistant | MessageRole.User;
    };
  };
}

export const concatenateChatCompletionChunks =
  () =>
  (source: Observable<ChatEvent>): Observable<ConcatenatedMessage> =>
    source.pipe(
      filter((event: ChatEvent) => {
        if (event.type === StreamingChatResponseEventType.ChatCompletionChunk) {
          return true; // Always allow chunks
        }
        if (event.type === StreamingChatResponseEventType.ChatCompletionMessage) {
          // Only allow messages if they have a function call
          return !!(event.message.function_call?.name && event.message.function_call?.arguments);
        }
        return false;
      }),
      scan(
        (acc, event) => {
          if (event.type === StreamingChatResponseEventType.ChatCompletionChunk) {
            acc.message.content += event.message.content ?? '';
            if (!acc.functionCallFullySet) {
              acc.message.function_call.name += event.message.function_call?.name ?? '';
              acc.message.function_call.arguments += event.message.function_call?.arguments ?? '';
            }
          } else if (event.type === StreamingChatResponseEventType.ChatCompletionMessage) {
            if (event.message.content) {
              acc.message.content = event.message.content;
            }
            if (event.message.function_call?.name && event.message.function_call?.arguments) {
              acc.message.function_call.name = event.message.function_call.name;
              acc.message.function_call.arguments = event.message.function_call.arguments;
              acc.functionCallFullySet = true;
            }
          }
          return cloneDeep(acc);
        },
        {
          message: {
            content: '',
            function_call: {
              name: '',
              arguments: '',
              trigger: MessageRole.Assistant as const,
            },
            role: MessageRole.Assistant,
          },
          functionCallFullySet: false, // track if function_call is set by a full message
        } as ConcatenatedMessage & { functionCallFullySet: boolean }
      ),
      map((acc) => {
        // Remove the temporary flag before returning
        const { functionCallFullySet, ...result } = acc;
        return result;
      }),
      defaultIfEmpty({
        message: {
          content: '',
          function_call: {
            name: '',
            arguments: '',
            trigger: MessageRole.Assistant,
          },
          role: MessageRole.Assistant,
        },
      } as ConcatenatedMessage)
    );
