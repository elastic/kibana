/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionChunkEvent } from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import type { AIMessageChunk } from '@langchain/core/messages';
import { completionChunkToLangchain } from './chunks';

const chunkEvent = (overrides: Partial<ChatCompletionChunkEvent>): ChatCompletionChunkEvent => ({
  type: ChatCompletionEventType.ChatCompletionChunk,
  content: '',
  tool_calls: [],
  ...overrides,
});

describe('completionChunkToLangchain', () => {
  it('carries reasoning chunks on additional_kwargs', () => {
    const message = completionChunkToLangchain(
      chunkEvent({ content: '', reasoning: 'thinking...' })
    );

    expect(message.additional_kwargs.reasoning).toEqual('thinking...');
  });

  it('omits reasoning from additional_kwargs when the chunk has none', () => {
    const message = completionChunkToLangchain(chunkEvent({ content: 'answer' }));

    expect(message.additional_kwargs).toEqual({});
  });

  it('merges reasoning with refusal when both are present', () => {
    const message = completionChunkToLangchain(
      chunkEvent({ refusal: 'no', reasoning: 'thinking' })
    );

    expect(message.additional_kwargs).toEqual({ refusal: 'no', reasoning: 'thinking' });
  });

  it('produces langchain chunks whose reasoning accumulates on concat', () => {
    const first = completionChunkToLangchain(chunkEvent({ reasoning: 'think' }));
    const second = completionChunkToLangchain(chunkEvent({ reasoning: ' more' }));
    const merged: AIMessageChunk = first.concat(second);

    expect(merged.additional_kwargs.reasoning).toEqual('think more');
  });
});
