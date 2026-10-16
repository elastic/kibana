/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import { ChatCompletionEventType } from '@kbn/inference-common';
import { processOpenAIStream } from './process_openai_stream';

describe('processOpenAIStream', () => {
  it('does not accept null-object chunks by default', async () => {
    const result = await lastValueFrom(
      of(
        JSON.stringify({
          id: 'null-object',
          object: null,
          created: 1753747200,
          model: 'claude-sonnet-4',
          choices: [{ index: 0, delta: { content: 'ignored' }, finish_reason: null }],
        }),
        JSON.stringify({
          id: 'canonical',
          object: 'chat.completion.chunk',
          created: 1753747200,
          model: 'gpt-4o',
          choices: [{ index: 0, delta: { content: 'emitted' }, finish_reason: null }],
        })
      ).pipe(processOpenAIStream(), toArray())
    );

    expect(result).toEqual([
      {
        content: 'emitted',
        tool_calls: [],
        type: ChatCompletionEventType.ChatCompletionChunk,
      },
    ]);
  });

  it('emits chunk events for reasoning-only deltas', async () => {
    const result = await lastValueFrom(
      of(
        JSON.stringify({
          id: 'reasoning',
          object: 'chat.completion.chunk',
          created: 1753747200,
          model: 'gpt-5',
          choices: [{ index: 0, delta: { reasoning: 'thinking...' }, finish_reason: null }],
        })
      ).pipe(processOpenAIStream(), toArray())
    );

    expect(result).toEqual([
      {
        content: '',
        reasoning: 'thinking...',
        tool_calls: [],
        type: ChatCompletionEventType.ChatCompletionChunk,
      },
    ]);
  });

  it('preserves token-limit errors for accepted null-object chunks', async () => {
    const result$ = of(
      JSON.stringify({
        id: 'null-object',
        object: null,
        created: 1753747200,
        model: 'claude-sonnet-4',
        choices: [{ index: 0, delta: {}, finish_reason: 'length' }],
      })
    ).pipe(processOpenAIStream({ allowNullObjectWithChoices: true }), toArray());

    await expect(lastValueFrom(result$)).rejects.toThrow('Token limit reached');
  });
});
