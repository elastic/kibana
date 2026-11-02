/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from 'gpt-tokenizer';
import type { ChatCompletionChunkEvent } from '@kbn/inference-common';
import type { OpenAIRequest } from './types';
import { mergeChunks } from '../../utils';

const ENCODE_OPTIONS = { allowedSpecial: 'all' as const };

function contentToString(
  content: string | Array<{ type: string; text?: string; refusal?: string }> | null | undefined
): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return content
    .map((part) => {
      if (part.type === 'text') return part.text ?? '';
      if (part.type === 'refusal') return part.refusal ?? '';
      // Non-text parts (image_url, input_audio, etc.) can't be tokenized directly;
      // use a placeholder so they contribute a rough token estimate rather than zero.
      return `[${part.type}]`;
    })
    .join('\n');
}

export const manuallyCountPromptTokens = (request: OpenAIRequest) => {
  // per https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
  const tokensFromMessages = encode(
    request.messages
      .map(
        (msg) =>
          `<|start|>${msg.role}\n${contentToString(msg.content)}\n${
            'name' in msg
              ? msg.name
              : 'function_call' in msg && msg.function_call
              ? msg.function_call.name + '\n' + msg.function_call.arguments
              : ''
          }<|end|>`
      )
      .join('\n'),
    ENCODE_OPTIONS
  ).length;

  // this is an approximation. OpenAI cuts off a function schema
  // at a certain level of nesting, so their token count might
  // be lower than what we are calculating here.
  const tokensFromFunctions = request.tools
    ? encode(
        request.tools
          ?.map(({ function: fn }) => {
            return `${fn.name}:${fn.description}:${JSON.stringify(fn.parameters)}`;
          })
          .join('\n'),
        ENCODE_OPTIONS
      ).length
    : 0;

  return tokensFromMessages + tokensFromFunctions;
};

export const manuallyCountCompletionTokens = (chunks: ChatCompletionChunkEvent[]) => {
  const message = mergeChunks(chunks);

  const tokenFromContent = encode(message.content, ENCODE_OPTIONS).length;

  const tokenFromToolCalls = message.tool_calls?.length
    ? encode(
        message.tool_calls
          .map((toolCall) => {
            return JSON.stringify(toolCall);
          })
          .join('\n'),
        ENCODE_OPTIONS
      ).length
    : 0;

  return tokenFromContent + tokenFromToolCalls;
};
