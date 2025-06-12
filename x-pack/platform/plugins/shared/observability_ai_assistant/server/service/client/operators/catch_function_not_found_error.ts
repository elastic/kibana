/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, filter, of, OperatorFunction, share, throwError } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { MessageRole } from '../../../../common';
import {
  ChatCompletionChunkEvent,
  isFunctionNotFoundError,
  MessageOrChatEvent,
  StreamingChatResponseEventType,
} from '../../../../common/conversation_complete';
import { emitWithConcatenatedMessage } from '../../../../common/utils/emit_with_concatenated_message';

function appendFunctionLimitExceededErrorMessageToAssistantResponse(): OperatorFunction<
  MessageOrChatEvent,
  MessageOrChatEvent
> {
  return (source$) => {
    return source$.pipe(
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
            // remove any function call from the response so the stream can close
            function_call: {
              name: '',
              arguments: '',
              trigger: MessageRole.Assistant,
            },
          },
        };
      })
    );
  };
}

// we catch a function not found error, if:
// - the function limit has been exceeded,
// we append to the message to prevent the
// error going back to the LLM
// else: we complete the observable, and
// allow the LLM to correct the error
export function catchFunctionNotFoundError(
  functionLimitExceeded: boolean
): OperatorFunction<MessageOrChatEvent, MessageOrChatEvent> {
  return (source$) => {
    const shared$ = source$.pipe(share());
    const chunksWithoutErrors$ = shared$.pipe(
      filter(
        (event): event is ChatCompletionChunkEvent =>
          event.type === StreamingChatResponseEventType.ChatCompletionChunk
      ),
      catchError(() => of())
    );

    return shared$.pipe(
      catchError((error) => {
        if (isFunctionNotFoundError(error)) {
          if (functionLimitExceeded) {
            return chunksWithoutErrors$.pipe(
              appendFunctionLimitExceededErrorMessageToAssistantResponse()
            );
          }
          return chunksWithoutErrors$.pipe(emitWithConcatenatedMessage());
        }
        return throwError(() => error);
      })
    );
  };
}
