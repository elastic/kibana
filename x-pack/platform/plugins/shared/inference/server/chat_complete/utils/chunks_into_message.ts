/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatCompletionChunkEvent,
  ChatCompletionMessageEvent,
  ChatCompletionTokenCountEvent,
  ToolOptions,
  UnvalidatedToolCall,
} from '@kbn/inference-common';
import { ChatCompletionEventType, withoutTokenCountEvents } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { OperatorFunction } from 'rxjs';
import { map, merge, share, toArray } from 'rxjs';
import { validateToolCalls } from '../../util/validate_tool_calls';

export function chunksIntoMessage<TToolOptions extends ToolOptions>({
  logger,
  toolOptions,
}: {
  toolOptions: TToolOptions;
  logger: Pick<Logger, 'debug'>;
}): OperatorFunction<
  ChatCompletionChunkEvent | ChatCompletionTokenCountEvent,
  | ChatCompletionChunkEvent
  | ChatCompletionTokenCountEvent
  | ChatCompletionMessageEvent<TToolOptions>
> {
  return (chunks$) => {
    const shared$ = chunks$.pipe(share());

    return merge(
      shared$,
      shared$.pipe(
        withoutTokenCountEvents(),
        toArray(),
        map((chunks): ChatCompletionMessageEvent<TToolOptions> => {
          const concatenatedChunk = chunks.reduce(
            (prev, chunk) => {
              prev.content += chunk.content ?? '';

              chunk.tool_calls?.forEach((toolCall) => {
                let prevToolCall = prev.tool_calls[toolCall.index];
                if (!prevToolCall) {
                  prev.tool_calls[toolCall.index] = {
                    function: {
                      name: '',
                      arguments: '',
                    },
                    toolCallId: '',
                  };

                  prevToolCall = prev.tool_calls[toolCall.index];
                }

                prevToolCall.function.name += toolCall.function.name;
                prevToolCall.function.arguments += toolCall.function.arguments;
                prevToolCall.toolCallId += toolCall.toolCallId;
              });

              return prev;
            },
            { content: '', tool_calls: [] as UnvalidatedToolCall[] }
          );

          // some models (Claude not to name it) can have their toolCall index not start at 0, so we remove the null elements
          concatenatedChunk.tool_calls = concatenatedChunk.tool_calls.filter((call) => !!call);

          logger.debug(() => `Received completed message: ${JSON.stringify(concatenatedChunk)}`);

          const validatedToolCalls = validateToolCalls<TToolOptions>({
            ...toolOptions,
            toolCalls: concatenatedChunk.tool_calls,
          });

          return {
            type: ChatCompletionEventType.ChatCompletionMessage,
            content: concatenatedChunk.content,
            toolCalls: validatedToolCalls,
          };
        })
      )
    );
  };
}
