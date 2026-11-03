/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import { ChatCompletionEventType } from '@kbn/inference-common';
import type { OpenAIChatCompletionChunkDelta, OpenAIChatCompletionMessage } from './types';
import {
  CONTENT_FILTER_REFUSAL,
  chunkFromCompletionResponse,
  chunkFromOpenAI,
  tokenCountFromOpenAI,
} from './from_openai';

type FinishReason = OpenAI.ChatCompletionChunk['choices'][number]['finish_reason'];

const createChunk = (
  delta: OpenAIChatCompletionChunkDelta,
  finishReason: FinishReason = null
): OpenAI.ChatCompletionChunk => ({
  id: 'chunk-id',
  object: 'chat.completion.chunk',
  created: 1753747200,
  model: 'gpt-5',
  choices: [{ index: 0, delta, finish_reason: finishReason }],
});

const createCompletion = (
  message: OpenAIChatCompletionMessage,
  finishReason: OpenAI.ChatCompletion['choices'][number]['finish_reason'] = 'stop'
): OpenAI.ChatCompletion => ({
  id: 'completion-id',
  object: 'chat.completion',
  created: 1753747200,
  model: 'gpt-5',
  choices: [{ index: 0, message, finish_reason: finishReason, logprobs: null }],
});

describe('chunkFromOpenAI', () => {
  it('populates reasoning when present on the delta', () => {
    expect(chunkFromOpenAI(createChunk({ content: '', reasoning: 'Let me think' }))).toEqual({
      type: ChatCompletionEventType.ChatCompletionChunk,
      content: '',
      reasoning: 'Let me think',
      tool_calls: [],
    });
  });

  it('leaves reasoning undefined when absent from the delta', () => {
    expect(chunkFromOpenAI(createChunk({ content: 'Hello' })).reasoning).toBeUndefined();
  });

  it('leaves reasoning undefined when null on the delta', () => {
    expect(
      chunkFromOpenAI(createChunk({ content: 'Hello', reasoning: null })).reasoning
    ).toBeUndefined();
  });

  it('sets a refusal when the chunk ends with finish_reason content_filter and no refusal text', () => {
    // Anthropic's `stop_reason: refusal` reaches us this way through the Elasticsearch
    // inference API: an empty delta and the finish reason, nothing else.
    expect(chunkFromOpenAI(createChunk({}, 'content_filter'))).toEqual({
      type: ChatCompletionEventType.ChatCompletionChunk,
      content: '',
      refusal: CONTENT_FILTER_REFUSAL,
      tool_calls: [],
    });
  });

  it('keeps the provider refusal text over the content_filter placeholder', () => {
    expect(
      chunkFromOpenAI(createChunk({ refusal: 'I cannot help with that.' }, 'content_filter'))
        .refusal
    ).toBe('I cannot help with that.');
  });

  it('leaves refusal undefined for the other finish reasons', () => {
    expect(chunkFromOpenAI(createChunk({ content: 'Hello' }, 'stop')).refusal).toBeUndefined();
    expect(chunkFromOpenAI(createChunk({}, 'tool_calls')).refusal).toBeUndefined();
  });
});

describe('chunkFromCompletionResponse', () => {
  it('populates reasoning when present on the message', () => {
    expect(
      chunkFromCompletionResponse(
        createCompletion({
          role: 'assistant',
          content: 'Answer',
          refusal: null,
          reasoning: 'Let me think',
        })
      )
    ).toEqual({
      type: ChatCompletionEventType.ChatCompletionChunk,
      content: 'Answer',
      reasoning: 'Let me think',
      tool_calls: [],
    });
  });

  it('leaves reasoning undefined when absent from the message', () => {
    expect(
      chunkFromCompletionResponse(
        createCompletion({ role: 'assistant', content: 'Answer', refusal: null })
      ).reasoning
    ).toBeUndefined();
  });

  it('sets a refusal when the completion ends with finish_reason content_filter and no refusal text', () => {
    expect(
      chunkFromCompletionResponse(
        createCompletion({ role: 'assistant', content: null, refusal: null }, 'content_filter')
      ).refusal
    ).toBe(CONTENT_FILTER_REFUSAL);
  });

  it('keeps the provider refusal text over the content_filter placeholder', () => {
    expect(
      chunkFromCompletionResponse(
        createCompletion(
          { role: 'assistant', content: null, refusal: 'I cannot help with that.' },
          'content_filter'
        )
      ).refusal
    ).toBe('I cannot help with that.');
  });
});

describe('tokenCountFromOpenAI', () => {
  it('maps reasoning tokens to thinking and excludes them from completion', () => {
    expect(
      tokenCountFromOpenAI(
        {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
          completion_tokens_details: { reasoning_tokens: 12 },
        },
        'gpt-5'
      )
    ).toEqual({
      type: ChatCompletionEventType.ChatCompletionTokenCount,
      tokens: {
        prompt: 10,
        completion: 8,
        total: 30,
        thinking: 12,
      },
      model: 'gpt-5',
    });
  });

  it('leaves thinking undefined when reasoning tokens are not provided', () => {
    const event = tokenCountFromOpenAI({
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    });

    expect(event.tokens.thinking).toBeUndefined();
    expect(event.tokens).toEqual({ prompt: 10, completion: 20, total: 30 });
  });
});
