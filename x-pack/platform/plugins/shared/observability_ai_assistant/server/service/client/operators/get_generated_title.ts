/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, mergeMap, Observable, of, tap, from } from 'rxjs';
import { Logger } from '@kbn/logging';
import { ChatCompleteResponse } from '@kbn/inference-common';
import type { ObservabilityAIAssistantClient } from '..';
import { Message, MessageRole, StreamingChatResponseEventType } from '../../../../common';
import { TokenCountEvent } from '../../../../common/conversation_complete';
import { LangTracer } from '../instrumentation/lang_tracer';

export const TITLE_CONVERSATION_FUNCTION_NAME = 'title_conversation';

type ChatFunctionWithoutConnectorAndTokenCount = (
  name: string,
  params: Omit<
    Parameters<ObservabilityAIAssistantClient['chat']>[1],
    'connectorId' | 'signal' | 'simulateFunctionCalling'
  >
) => Promise<ChatCompleteResponse>;

export function getGeneratedTitle({
  messages,
  chat,
  logger,
  tracer,
}: {
  messages: Message[];
  chat: ChatFunctionWithoutConnectorAndTokenCount;
  logger: Pick<Logger, 'debug' | 'error'>;
  tracer: LangTracer;
}): Observable<string | TokenCountEvent> {
  return from(
    chat('generate_title', {
      messages: [
        {
          '@timestamp': new Date().toString(),
          message: {
            role: MessageRole.System,
            content: `You are a helpful assistant for Elastic Observability. Assume the following message is the start of a conversation between you and a user; give this conversation a title based on the content below. DO NOT UNDER ANY CIRCUMSTANCES wrap this title in single or double quotes. This title is shown in a list of conversations to the user, so title it for the user, not for you.`,
          },
        },
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.User,
            content: messages
              .filter((msg) => msg.message.role !== MessageRole.System)
              .reduce((acc, curr) => {
                return `${acc} ${curr.message.role}: ${curr.message.content}`;
              }, 'Generate a title, using the title_conversation_function, based on the following conversation:\n\n'),
          },
        },
      ],
      functions: [
        {
          name: TITLE_CONVERSATION_FUNCTION_NAME,
          description:
            'Use this function to title the conversation. Do not wrap the title in quotes',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
              },
            },
            required: ['title'],
          },
        },
      ],
      functionCall: TITLE_CONVERSATION_FUNCTION_NAME,
      tracer,
      stream: false,
    })
  ).pipe(
    mergeMap((response) => {
      let title: string =
        (response.toolCalls[0].function.name
          ? (response.toolCalls[0].function.arguments as { title: string }).title
          : response.content) || '';

      // This captures a string enclosed in single or double quotes.
      // It extracts the string content without the quotes.
      // Example matches:
      // - "Hello, World!" => Captures: Hello, World!
      // - 'Another Example' => Captures: Another Example
      // - JustTextWithoutQuotes => Captures: JustTextWithoutQuotes
      title = title.replace(/^"(.*)"$/g, '$1').replace(/^'(.*)'$/g, '$1');

      const tokenCount: TokenCountEvent | undefined = response.tokens
        ? {
            type: StreamingChatResponseEventType.TokenCount,
            tokens: {
              completion: response.tokens.completion,
              prompt: response.tokens.prompt,
              total: response.tokens.total,
            },
          }
        : undefined;

      const events: Array<string | TokenCountEvent> = [title];
      if (tokenCount) events.push(tokenCount);

      return from(events); // Emit each event separately
    }),
    tap((event) => {
      if (typeof event === 'string') {
        logger.debug(`Generated title: ${event}`);
      }
    }),
    catchError((error) => {
      logger.error(`Error generating title`);
      logger.error(error);
      // TODO: i18n
      return of('New conversation');
    })
  );
}
