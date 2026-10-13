/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createFinalChunk,
  inferenceResponseToOpenAi,
  tokenCountToOpenAiUsage,
} from './openai_format';

describe('tokenCountToOpenAiUsage', () => {
  it('maps prompt, completion and total tokens', () => {
    expect(tokenCountToOpenAiUsage({ prompt: 10, completion: 5, total: 15 })).toEqual({
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    });
  });

  it('reports cached prompt tokens', () => {
    expect(tokenCountToOpenAiUsage({ prompt: 10, completion: 5, total: 15, cached: 8 })).toEqual({
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
      prompt_tokens_details: { cached_tokens: 8 },
    });
  });

  it('is used for streaming and non-streaming responses', () => {
    const tokens = { prompt: 10, completion: 5, total: 15, cached: 8 };
    const expected = tokenCountToOpenAiUsage(tokens);

    expect(createFinalChunk('m', 'id', false, tokens)).toHaveProperty('usage', expected);
    expect(inferenceResponseToOpenAi({ content: 'hi', toolCalls: [], tokens }, 'm')).toHaveProperty(
      'usage',
      expected
    );
  });
});
