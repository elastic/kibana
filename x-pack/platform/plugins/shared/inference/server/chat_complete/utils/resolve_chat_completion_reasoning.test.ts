/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveChatCompletionReasoning } from './resolve_chat_completion_reasoning';

describe('resolveChatCompletionReasoning', () => {
  it('returns the caller-provided reasoning unchanged', () => {
    expect(
      resolveChatCompletionReasoning({
        reasoning: { effort: 'high', summary: 'detailed' },
        hasNativeTools: true,
      })
    ).toEqual({ effort: 'high', summary: 'detailed' });
  });

  it('defaults to effort none when native tools are present and reasoning is omitted', () => {
    expect(
      resolveChatCompletionReasoning({
        hasNativeTools: true,
      })
    ).toEqual({ effort: 'none' });
  });

  it('returns undefined when tools are absent and reasoning is omitted', () => {
    expect(
      resolveChatCompletionReasoning({
        hasNativeTools: false,
      })
    ).toBeUndefined();
  });

  it('keeps an explicit none effort when tools are present', () => {
    expect(
      resolveChatCompletionReasoning({
        reasoning: { effort: 'none' },
        hasNativeTools: true,
      })
    ).toEqual({ effort: 'none' });
  });
});
