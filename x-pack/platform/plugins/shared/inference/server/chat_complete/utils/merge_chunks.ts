/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatCompletionChunkEvent, UnvalidatedToolCall } from '@kbn/inference-common';

interface UnvalidatedMessage {
  content: string;
  tool_calls: UnvalidatedToolCall[];
}

/**
 * Merges chunks into a message, concatenating the content and tool calls.
 */
export const mergeChunks = (chunks: ChatCompletionChunkEvent[]): UnvalidatedMessage => {
  const message = chunks.reduce<UnvalidatedMessage>(
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
    { content: '', tool_calls: [] }
  );

  // some models (Claude not to name it) can have their toolCall index not start at 0, so we remove the null elements
  message.tool_calls = message.tool_calls
    .filter((call) => !!call)
    .map((call) => {
      if (call.function.arguments === '') {
        call.function.arguments = '{}';
      }
      return call;
    });

  return message;
};
