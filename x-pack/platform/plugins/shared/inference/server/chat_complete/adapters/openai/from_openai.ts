/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import {
  ChatCompletionChunkEvent,
  ChatCompletionEventType,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';

export function chunkFromOpenAI(chunk: OpenAI.ChatCompletionChunk): ChatCompletionChunkEvent {
  const delta = chunk.choices[0].delta;

  return {
    type: ChatCompletionEventType.ChatCompletionChunk,
    content: delta.content ?? '',
    tool_calls:
      delta.tool_calls?.map((toolCall) => {
        return {
          function: {
            name: toolCall.function?.name ?? '',
            arguments: toolCall.function?.arguments ?? '',
          },
          toolCallId: toolCall.id ?? '',
          index: toolCall.index,
        };
      }) ?? [],
  };
}

export function tokenCountFromOpenAI(
  completionUsage: OpenAI.CompletionUsage
): ChatCompletionTokenCountEvent {
  return {
    type: ChatCompletionEventType.ChatCompletionTokenCount,
    tokens: {
      completion: completionUsage.completion_tokens,
      prompt: completionUsage.prompt_tokens,
      total: completionUsage.total_tokens,
      cached: completionUsage.prompt_tokens_details?.cached_tokens,
    },
  };
}
