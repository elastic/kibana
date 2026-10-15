/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import { ChatCompletionEventType } from '@kbn/inference-common';
import type { OpenAIChatCompletionChunkDelta, OpenAIChatCompletionMessage } from './types';
import { chunkFromCompletionResponse, chunkFromOpenAI, tokenCountFromOpenAI } from './from_openai';

const createChunk = (delta: OpenAIChatCompletionChunkDelta): OpenAI.ChatCompletionChunk => ({
  id: 'chunk-id',
  object: 'chat.completion.chunk',
  created: 1753747200,
  model: 'gpt-5',
  choices: [{ index: 0, delta, finish_reason: null }],
});

const createCompletion = (message: OpenAIChatCompletionMessage): OpenAI.ChatCompletion => ({
  id: 'completion-id',
  object: 'chat.completion',
  created: 1753747200,
  model: 'gpt-5',
  choices: [{ index: 0, message, finish_reason: 'stop', logprobs: null }],
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
