/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatCompletionChunkEvent, ChatCompletionTokenCountEvent } from '@kbn/inference-common';
import { AIMessageChunk } from '@langchain/core/messages';

// type is not exported from @langchain/core...
// import { ToolCallChunk } from '@langchain/core/messages/tools';
type ToolCallChunk = Required<AIMessageChunk>['tool_call_chunks'][number];

export const completionChunkToLangchain = (chunk: ChatCompletionChunkEvent): AIMessageChunk => {
  const toolCallChunks = chunk.tool_calls.map<ToolCallChunk>((toolCall) => {
    return {
      index: toolCall.index,
      id: toolCall.toolCallId,
      name: toolCall.function.name,
      args: toolCall.function.arguments,
      type: 'tool_call_chunk',
    };
  });

  return new AIMessageChunk({
    content: chunk.content,
    tool_call_chunks: toolCallChunks,
    additional_kwargs: {},
    response_metadata: {},
  });
};

export const tokenCountChunkToLangchain = (
  chunk: ChatCompletionTokenCountEvent
): AIMessageChunk => {
  return new AIMessageChunk({
    content: '',
    response_metadata: {
      usage: { ...chunk.tokens },
    },
    usage_metadata: {
      input_tokens: chunk.tokens.prompt,
      output_tokens: chunk.tokens.completion,
      total_tokens: chunk.tokens.total,
    },
  });
};
