/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last, lastValueFrom, map, merge, Observable, scan, share } from 'rxjs';
import type { Readable } from 'node:stream';
import { createParser } from 'eventsource-parser';
import { UnifiedChatCompleteResponse } from '../../../common/inference/types';

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
