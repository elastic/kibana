/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { catchError, filter, of, OperatorFunction, shareReplay, throwError } from 'rxjs';
import {
  ChatCompletionChunkEvent,
  MessageRole,
  StreamingChatResponseEventType,
} from '../../../common';
import { isFunctionNotFoundError, MessageOrChatEvent } from '../../../common/conversation_complete';
import { emitWithConcatenatedMessage } from '../../../common/utils/emit_with_concatenated_message';

export function catchFunctionLimitExceededError(): OperatorFunction<
  MessageOrChatEvent,
  MessageOrChatEvent
> {
  return (source$) => {
    const shared$ = source$.pipe(shareReplay());
    const chunksWithoutErrors$ = shared$.pipe(
      catchError(() => of()),
      shareReplay()
    );

    return shared$.pipe(
      catchError((error) => {
        if (isFunctionNotFoundError(error)) {
          const withInjectedErrorMessage$ = chunksWithoutErrors$.pipe(
            filter(
              (msg): msg is ChatCompletionChunkEvent =>
                msg.type === StreamingChatResponseEventType.ChatCompletionChunk
            ),
            emitWithConcatenatedMessage(async (concatenatedMessage) => {
              return {
                ...concatenatedMessage,
                message: {
                  ...concatenatedMessage.message,
                  content: `${concatenatedMessage.message.content}\n\n${i18n.translate(
                    'xpack.observabilityAiAssistant.functionCallLimitExceeded',
                    {
                      defaultMessage:
                        '\n\nNote: the Assistant tried to call a function, even though the limit was exceeded',
                    }
                  )}`,
                  function_call: {
                    name: '',
                    arguments: '',
                    trigger: MessageRole.Assistant,
                  },
                },
              };
            })
          );

          return withInjectedErrorMessage$;
        }
        return throwError(() => error);
      })
    );
  };
}
