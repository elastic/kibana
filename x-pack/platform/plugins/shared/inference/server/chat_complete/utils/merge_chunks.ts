/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionChunkEvent, UnvalidatedToolCall } from '@kbn/inference-common';
import { CONTENT_FILTER_REFUSAL } from './content_filter_refusal';

interface UnvalidatedMessage {
  content: string;
  refusal?: string;
  tool_calls: UnvalidatedToolCall[];
}

/**
 * Merges tool calls from chunks into a single array of tool calls.
 *
 * Merge logic:
 * - `toolCallId` and `function.name` appear in the first chunk and should be set once
 * - `function.arguments` is streamed across multiple chunks and should be accumulated
 * - When `toolCallId` is empty, it's a continuation chunk for the most recent tool call at that index
 */
const mergeToolCalls = (chunks: ChatCompletionChunkEvent[]): UnvalidatedToolCall[] => {
  // Map to store tool calls by their unique identifier
  const toolCallsMap = new Map<string, UnvalidatedToolCall>();
  // Map to track which index corresponds to which toolCallId
  const indexToToolCallId = new Map<number, string>();

  for (const chunk of chunks) {
    chunk.tool_calls?.forEach((toolCall) => {
      // Track toolCallId for continuation chunks
      if (toolCall.toolCallId) {
        indexToToolCallId.set(toolCall.index, toolCall.toolCallId);
      }

      const key = toolCall.toolCallId || indexToToolCallId.get(toolCall.index);
      if (!key) {
        throw new Error(
          `Tool call key is missing for index ${toolCall.index} in chunk ${JSON.stringify(chunk)}`
        );
      }

      const existingToolCall = toolCallsMap.get(key);
      const updatedToolCall: UnvalidatedToolCall = {
        function: {
          name: toolCall.function.name || existingToolCall?.function.name || '',
          arguments: (existingToolCall?.function.arguments || '') + toolCall.function.arguments,
        },
        toolCallId: toolCall.toolCallId || existingToolCall?.toolCallId || '',
      };

      toolCallsMap.set(key, updatedToolCall);
    });
  }

  return Array.from(toolCallsMap.values()).map((call) => {
    if (call.function.arguments === '') {
      return {
        ...call,
        function: {
          ...call.function,
          arguments: '{}',
        },
      };
    }
    return call;
  });
};

/**
 * Merges chunks into a message, concatenating the content and tool calls.
 */
export const mergeChunks = (chunks: ChatCompletionChunkEvent[]): UnvalidatedMessage => {
  const message = chunks.reduce<UnvalidatedMessage>(
    (prev, chunk) => {
      prev.content += chunk.content ?? '';
      // finish_reason: content_filter lands on the terminating chunk, often with an empty
      // delta. The OpenAI adapter synthesizes CONTENT_FILTER_REFUSAL for that case. Do not
      // let that placeholder replace a concrete refusal already accumulated from earlier
      // chunks (or the same stream would report the generic text instead of the provider's).
      if (chunk.refusal) {
        if (!prev.refusal || chunk.refusal !== CONTENT_FILTER_REFUSAL) {
          prev.refusal = chunk.refusal;
        }
      }

      return prev;
    },
    { content: '', tool_calls: [] }
  );

  message.tool_calls = mergeToolCalls(chunks);

  return message;
};
