/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isChatCompletionMessageEvent,
  Message,
  ToolDefinition,
} from '@kbn/inference-plugin/common';
import {
  ChatCompletionEvent,
  MessageRole,
  ToolMessage,
  UserMessage,
} from '@kbn/inference-plugin/common/chat_complete';
import { ToolCallsOf, ToolChoice } from '@kbn/inference-plugin/common/chat_complete/tools';
import { InferenceClient } from '@kbn/inference-plugin/server';
import { last, merge, Observable, of, OperatorFunction, share, switchMap, tap } from 'rxjs';

type CallbackReturn = ChatCompletionEvent | ToolMessage<Record<string, any>> | UserMessage;

type CallbackOf<
  TCallToolOptions extends CallToolOptions,
  TCallbackReturn extends CallbackReturn
> = ({}: {
  messages: Message[];
  toolCalls: ToolCallsOf<TCallToolOptions>['toolCalls'];
}) => Observable<TCallbackReturn>;

interface CallToolOptions {
  system: string;
  messages: Message[];
  inferenceClient: InferenceClient;
  connectorId: string;
  tools: Record<string, ToolDefinition>;
  toolChoice?: ToolChoice<string>;
}

type ObservableTypeOf<
  TCallToolOptions extends CallToolOptions,
  TCallbackReturn extends CallbackReturn
> = ChatCompletionEvent<TCallToolOptions> | TCallbackReturn;

export function callTools<
  TCallToolOptions extends CallToolOptions,
  TCallbackReturn extends CallbackReturn
>(
  { system, messages, inferenceClient, connectorId, tools, toolChoice }: TCallToolOptions,
  callback: CallbackOf<TCallToolOptions, TCallbackReturn>
): Observable<ObservableTypeOf<TCallToolOptions, TCallbackReturn>> {
  const nextMessages: Message[] = messages.concat();

  return inferenceClient
    .chatComplete({
      connectorId,
      system,
      messages,
      toolChoice,
      tools,
    })
    .pipe(
      switchMap((event) => {
        if (isChatCompletionMessageEvent<TCallToolOptions>(event)) {
          nextMessages.push({
            role: MessageRole.Assistant,
            content: event.content,
            toolCalls: event.toolCalls,
          });

          if (event.toolCalls.length) {
            return merge(
              of(event),
              callback({ toolCalls: event.toolCalls, messages: nextMessages }).pipe(
                handleToolCalls()
              )
            );
          }
        }
        return of(event);
      })
    );

  function handleToolCalls(): OperatorFunction<
    ObservableTypeOf<TCallToolOptions, TCallbackReturn>,
    ObservableTypeOf<TCallToolOptions, TCallbackReturn>
  > {
    return (source$) => {
      const shared$ = source$.pipe(share());

      const next$ = merge(
        shared$,
        shared$.pipe(
          tap((event) => {
            if ('role' in event) {
              nextMessages.push(event);
            } else if (isChatCompletionMessageEvent<TCallToolOptions>(event)) {
              nextMessages.push({
                role: MessageRole.Assistant,
                content: event.content,
                toolCalls: event.toolCalls,
              });
            }
          }),
          last(),
          switchMap(() => {
            if (nextMessages[nextMessages.length - 1].role !== MessageRole.Assistant) {
              const after$ = callTools<TCallToolOptions, TCallbackReturn>(
                {
                  system,
                  connectorId,
                  inferenceClient,
                  messages: nextMessages,
                  tools,
                  toolChoice,
                } as TCallToolOptions,
                callback
              );
              return after$;
            }
            return of();
          })
        )
      );
      return next$;
    };
  }
}
