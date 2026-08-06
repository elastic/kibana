/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last, lastValueFrom, map, merge, Observable, scan, share } from 'rxjs';
import type { Readable } from 'node:stream';
import { createParser } from 'eventsource-parser';
import type { UnifiedChatCompleteResponse } from '@kbn/connector-schemas/inference';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';

// TODO: Extract to the common package with appex-ai
export function eventSourceStreamIntoObservable(readable: Readable) {
  return new Observable<string>((subscriber) => {
    const parser = createParser({
      onEvent: (event) => {
        subscriber.next(event.data);
      },
    });

    async function processStream() {
      for await (const chunk of readable) {
        parser.feed(chunk.toString());
      }
    }

    processStream().then(
      () => {
        subscriber.complete();
      },
      (error) => {
        subscriber.error(error);
      }
    );
  });
}

export function chunksIntoMessage(obs$: Observable<UnifiedChatCompleteResponse>) {
  const shared$ = obs$.pipe(share());

  return lastValueFrom(
    merge(
      shared$,
      shared$.pipe(
        scan(
          (prev, chunk) => {
            if (chunk.choices.length > 0 && !chunk.usage) {
              prev.choices[0].message.content += chunk.choices[0].message.content ?? '';
              if (chunk.choices[0].message.refusal) {
                prev.choices[0].message.refusal = chunk.choices[0].message.refusal;
              }

              chunk.choices[0].message.tool_calls?.forEach((toolCall) => {
                if (toolCall.index !== undefined) {
                  const prevToolCallLength = prev.choices[0].message.tool_calls?.length ?? 0;
                  if (prevToolCallLength - 1 !== toolCall.index) {
                    if (!prev.choices[0].message.tool_calls) {
                      prev.choices[0].message.tool_calls = [];
                    }
                    prev.choices[0].message.tool_calls.push({
                      function: {
                        name: '',
                        arguments: '',
                      },
                      id: '',
                    });
                  }
                  const prevToolCall = prev.choices[0].message.tool_calls[toolCall.index];

                  if (toolCall.function?.name) {
                    prevToolCall.function.name += toolCall.function?.name;
                  }
                  if (toolCall.function?.arguments) {
                    prevToolCall.function.arguments += toolCall.function?.arguments;
                  }
                  if (toolCall.id) {
                    prevToolCall.id += toolCall.id;
                  }
                  if (toolCall.type) {
                    prevToolCall.type = toolCall.type;
                  }
                }
              });
            } else if (chunk.usage) {
              prev.usage = chunk.usage;
            }
            return { ...prev, id: chunk.id, model: chunk.model };
          },
          {
            choices: [
              {
                message: {
                  content: '',
                  refusal: null,
                  role: 'assistant',
                },
              },
            ],
            object: 'chat.completion',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any
        ),
        last(),
        map((concatenatedChunk): UnifiedChatCompleteResponse => {
          // TODO: const validatedToolCalls = validateToolCalls(concatenatedChunk.choices[0].message.tool_calls);
          if (concatenatedChunk.choices[0].message.content === '') {
            concatenatedChunk.choices[0].message.content = null;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          concatenatedChunk.choices[0].message.tool_calls?.forEach((toolCall: any) => {
            if (toolCall.function?.arguments?.trim() === '') {
              toolCall.function.arguments = '{}';
            }
          });
          return concatenatedChunk;
        })
      )
    )
  );
}

/**
 * Status codes that represent a permanent, client-side condition: the request will
 * never succeed on retry without a configuration or entitlement change.
 *
 * - 401: the credentials the connector presents are rejected.
 * - 403: the org/deployment is not authorized for the requested model.
 * - 404: the referenced inference endpoint does not exist.
 */
const PERMANENT_CLIENT_ERROR_STATUS_CODES = [401, 403, 404];

const hasStatusCode = (error: string, statusCode: number) =>
  error.includes(`status [${statusCode}]`);

/**
 * Classifies inference errors that are caused by the user's configuration rather than by a
 * transient framework/platform failure, and throws them tagged as `TaskErrorSource.USER` so
 * they are not retried.
 *
 * Covers 429 quota exhaustion, plus permanent client errors (401/403/404).
 * The 429 branch is a temporary measure until the backend is updated to return the original
 * error code instead of a general 400 (https://github.com/elastic/elasticsearch/issues/139710).
 */
export const detectandThrowUserError = (error: string) => {
  if (error.includes('status [429]') && error.includes('quota')) {
    throw createTaskRunError(new Error(error), TaskErrorSource.USER);
  }

  // Permanent client errors must not be retried. Without this, they are classified as
  // framework errors and the task is retried indefinitely against a condition that
  // cannot resolve on its own.
  if (PERMANENT_CLIENT_ERROR_STATUS_CODES.some((code) => hasStatusCode(error, code))) {
    throw createTaskRunError(new Error(error), TaskErrorSource.USER);
  }
};
