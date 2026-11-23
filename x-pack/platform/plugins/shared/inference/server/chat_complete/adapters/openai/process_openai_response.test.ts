/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type OpenAI from 'openai';
import { lastValueFrom, of, toArray } from 'rxjs';
import { processOpenAIResponse } from './process_openai_response';

const completion = (
  finishReason: OpenAI.ChatCompletion['choices'][number]['finish_reason'],
  content: string
): OpenAI.ChatCompletion =>
  ({
    id: '1',
    object: 'chat.completion',
    created: 0,
    model: 'gpt-4o',
    choices: [
      {
        index: 0,
        finish_reason: finishReason,
        logprobs: null,
        message: { role: 'assistant', content, refusal: null },
      },
    ],
  } as OpenAI.ChatCompletion);

describe('processOpenAIResponse', () => {
  it('throws when the completion was cut off by the token limit', async () => {
    await expect(
      lastValueFrom(of(completion('length', '')).pipe(processOpenAIResponse(), toArray()))
    ).rejects.toThrow('Token limit reached');
  });

  it('returns the message when the model stopped normally', async () => {
    const events = await lastValueFrom(
      of(completion('stop', 'answer')).pipe(processOpenAIResponse(), toArray())
    );
    expect(events[0]).toEqual(expect.objectContaining({ content: 'answer' }));
  });
});
