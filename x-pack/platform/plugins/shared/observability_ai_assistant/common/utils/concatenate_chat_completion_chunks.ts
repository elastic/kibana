/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { type Observable, scan, filter, defaultIfEmpty } from 'rxjs';
import type { ChatCompletionChunkEvent, ChatEvent } from '../conversation_complete';
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
      filter(
        (event): event is ChatCompletionChunkEvent =>
          event.type === StreamingChatResponseEventType.ChatCompletionChunk
      ),
      scan(
        (acc, { message }) => {
          acc.message.content += message.content ?? '';
          acc.message.function_call.name += message.function_call?.name ?? '';
          acc.message.function_call.arguments += message.function_call?.arguments ?? '';

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
        } as ConcatenatedMessage
      ),
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
      })
    );
