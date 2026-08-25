/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  catchError,
  combineLatest,
  filter,
  isObservable,
  last,
  map,
  Observable,
  of,
  shareReplay,
  toArray,
} from 'rxjs';
import {
  MessageRole,
  StreamingChatResponseEventType,
  type ConversationCreateEvent,
  type ConversationUpdateEvent,
  type Message,
  type MessageAddEvent,
  type StreamingChatResponseEventWithoutError,
} from '../../common';
import type { ObservabilityAIAssistantScreenContext } from '../../common/types';
import { createFunctionResponseMessage } from '../../common/utils/create_function_response_message';
import type { ObservabilityAIAssistantAPIClientRequestParamsOf } from '../api';
import type { ObservabilityAIAssistantChatService } from '../types';
import { createPublicFunctionResponseError } from '../utils/create_function_response_error';

export function complete(
  {
    client,
    getScreenContexts,
    connectorId,
    conversationId,
    messages: initialMessages,
    persist,
    disableFunctions,
    signal,
    instructions,
    scopes,
  }: {
    client: Pick<ObservabilityAIAssistantChatService, 'chat' | 'complete'>;
    getScreenContexts: () => ObservabilityAIAssistantScreenContext[];
  } & Parameters<ObservabilityAIAssistantChatService['complete']>[0],
  requestCallback: (
    params: ObservabilityAIAssistantAPIClientRequestParamsOf<'POST /internal/observability_ai_assistant/chat/complete'>
  ) => Observable<StreamingChatResponseEventWithoutError>
): Observable<StreamingChatResponseEventWithoutError> {
  return new Observable<StreamingChatResponseEventWithoutError>((subscriber) => {
    const screenContexts = getScreenContexts();
    const allActions = screenContexts.flatMap((context) => context.actions ?? []);

    const response$ = requestCallback({
      params: {
        body: {
          connectorId,
          messages: initialMessages,
          persist,
          disableFunctions,
          screenContexts,
          conversationId,
          instructions,
          scopes,
        },
      },
    }).pipe(shareReplay());

    const messages$ = response$.pipe(
      filter(
        (event): event is MessageAddEvent =>
          event.type === StreamingChatResponseEventType.MessageAdd
      ),
      map((event) => event.message),
      toArray(),
      last()
    );

    const conversationId$ = response$.pipe(
      last(
        (event): event is ConversationCreateEvent | ConversationUpdateEvent =>
          event.type === StreamingChatResponseEventType.ConversationCreate ||
          event.type === StreamingChatResponseEventType.ConversationUpdate
      ),
      map((event) => event.conversation.id),
      catchError(() => {
        return of(conversationId);
      })
    );

    response$.subscribe({
      next: (val) => {
        subscriber.next(val);
      },
      error: (error) => {
        subscriber.error(error);
      },
    });

    combineLatest([conversationId$, messages$, response$.pipe(last())]).subscribe({
      next: ([nextConversationId, allMessages]) => {
        const functionCall = allMessages[allMessages.length - 1]?.message.function_call;

        if (!functionCall?.name) {
          subscriber.complete();
          return;
        }

        const requestedAction = allActions.find((action) => action.name === functionCall.name);

        function next(nextMessages: Message[]) {
          if (
            nextMessages[nextMessages.length - 1].message.role === MessageRole.Assistant &&
            !persist
          ) {
            subscriber.complete();
            return;
          }

          complete(
            {
              client,
              getScreenContexts,
              connectorId,
              conversationId: nextConversationId || conversationId,
              messages: initialMessages.concat(nextMessages),
              signal,
              persist,
              disableFunctions,
              instructions,
              scopes,
            },
            requestCallback
          ).subscribe(subscriber);
        }

        if (!requestedAction) {
          const errorMessage = createPublicFunctionResponseError({
            name: functionCall.name,
            error: new Error(`Requested action ${functionCall.name} was not found`),
          });

          subscriber.next(errorMessage);

          next([...allMessages, errorMessage.message]);
          return;
        }

        requestedAction
          .respond({
            signal,
            client,
            args: JSON.parse(functionCall.arguments || '{}'),
            connectorId,
            messages: allMessages,
          })
          .then(async (functionResponse) => {
            if (isObservable(functionResponse)) {
              const executedMessage = createFunctionResponseMessage({
                name: functionCall.name,
                content: {
                  executed: true,
                },
              });

              allMessages.push(executedMessage.message);

              subscriber.next(executedMessage);

              return await new Promise<void>((resolve, reject) => {
                functionResponse.subscribe({
                  next: (val) => {
                    if (val.type === StreamingChatResponseEventType.MessageAdd) {
                      allMessages.push(val.message);
                    }
                    subscriber.next(val);
                  },
                  error: (error) => {
                    reject(error);
                  },
                  complete: () => {
                    resolve();
                  },
                });
              });
            }

            return createFunctionResponseMessage({
              name: functionCall.name,
              content: functionResponse.content,
              data: functionResponse.data,
            });
          })
          .catch((error) => {
            return createPublicFunctionResponseError({
              name: functionCall.name,
              error,
            });
          })
          .then((event) => {
            if (event) {
              allMessages.push(event.message);

              subscriber.next(event);
            }
            next(allMessages);
          });
      },
      error: (error) => {
        subscriber.error(error);
      },
    });
  });
}
