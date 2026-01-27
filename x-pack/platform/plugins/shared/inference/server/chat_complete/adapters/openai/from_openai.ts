/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import type {
  ChatCompletionChunkEvent,
  ChatCompletionTokenCountEvent,
} from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';

export function chunkFromOpenAI(chunk: OpenAI.ChatCompletionChunk): ChatCompletionChunkEvent {
  const delta = chunk.choices[0].delta;

  return {
    type: ChatCompletionEventType.ChatCompletionChunk,
    content: delta.content ?? '',
    refusal: delta.refusal ?? undefined,
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
  completionUsage: OpenAI.CompletionUsage,
  model?: string
): ChatCompletionTokenCountEvent {
  return {
    type: ChatCompletionEventType.ChatCompletionTokenCount,
    tokens: {
      completion: completionUsage.completion_tokens,
      prompt: completionUsage.prompt_tokens,
      total: completionUsage.total_tokens,
      cached: completionUsage.prompt_tokens_details?.cached_tokens,
    },
    ...(model ? { model } : {}),
  };
}

export function chunkFromCompletionResponse(
  completion: OpenAI.ChatCompletion
): ChatCompletionChunkEvent {
  const message = completion.choices[0].message;
  return {
    type: ChatCompletionEventType.ChatCompletionChunk,
    content: message.content ?? '',
    refusal: message.refusal ?? undefined,
    tool_calls:
      message.tool_calls?.map((toolCall, i) => {
        return {
          function: {
            name: toolCall.function?.name ?? '',
            arguments: toolCall.function?.arguments ?? '',
          },
          toolCallId: toolCall.id ?? '',
          index: i,
        };
      }) ?? [],
  };
}
