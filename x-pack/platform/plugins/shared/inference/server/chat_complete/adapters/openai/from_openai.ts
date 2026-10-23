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
import { CONTENT_FILTER_REFUSAL } from '../../utils/content_filter_refusal';
import type { OpenAIChatCompletionChunkDelta, OpenAIChatCompletionMessage } from './types';

export { CONTENT_FILTER_REFUSAL };

const refusalFromFinishReason = (
  refusal: string | null | undefined,
  finishReason: string | null | undefined
): string | undefined => {
  if (refusal) return refusal;
  return finishReason === 'content_filter' ? CONTENT_FILTER_REFUSAL : undefined;
};

export function chunkFromOpenAI(chunk: OpenAI.ChatCompletionChunk): ChatCompletionChunkEvent {
  const choice = chunk.choices[0];
  const delta: OpenAIChatCompletionChunkDelta = choice.delta;

  return {
    type: ChatCompletionEventType.ChatCompletionChunk,
    content: delta.content ?? '',
    refusal: refusalFromFinishReason(delta.refusal, choice.finish_reason),
    reasoning: delta.reasoning ?? undefined,
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
  const thinking = completionUsage.completion_tokens_details?.reasoning_tokens;
  return {
    type: ChatCompletionEventType.ChatCompletionTokenCount,
    tokens: {
      completion: completionUsage.completion_tokens - (thinking ?? 0),
      prompt: completionUsage.prompt_tokens,
      total: completionUsage.total_tokens,
      cached: completionUsage.prompt_tokens_details?.cached_tokens,
      thinking,
    },
    ...(model ? { model } : {}),
  };
}

export function chunkFromCompletionResponse(
  completion: OpenAI.ChatCompletion
): ChatCompletionChunkEvent {
  const choice = completion.choices[0];
  const message: OpenAIChatCompletionMessage = choice.message;
  return {
    type: ChatCompletionEventType.ChatCompletionChunk,
    content: message.content ?? '',
    refusal: refusalFromFinishReason(message.refusal, choice.finish_reason),
    reasoning: message.reasoning ?? undefined,
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
