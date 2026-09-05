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
        model: 'gpt-5.4',
      })
    ).toEqual({ effort: 'high', summary: 'detailed' });
  });

  it('defaults to effort none when native tools are present and the model rejects tools with reasoning', () => {
    const models = [
      'gpt-5',
      'gpt-5.4',
      'openai/gpt-5',
      'openai-gpt-5.2',
      '.openai-gpt-5.4-chat_completion',
    ];
    for (const model of models) {
      expect(
        resolveChatCompletionReasoning({
          hasNativeTools: true,
          model,
        })
      ).toEqual({ effort: 'none' });
    }
  });

  it('returns undefined when tools are present but the model tolerates or requires reasoning', () => {
    const models = [
      'google-gemini-2.5-pro',
      '.google-gemini-3.5-flash-chat_completion',
      'openai-gpt-oss-120b',
      'anthropic-claude-5-sonnet',
      'gpt-4.1',
      'o3-mini',
      'gpt-52',
    ];
    for (const model of models) {
      expect(
        resolveChatCompletionReasoning({
          hasNativeTools: true,
          model,
        })
      ).toBeUndefined();
    }
  });

  it('returns undefined when tools are present and the model is unknown', () => {
    expect(
      resolveChatCompletionReasoning({
        hasNativeTools: true,
      })
    ).toBeUndefined();
  });

  it('returns undefined when tools are absent and reasoning is omitted', () => {
    expect(
      resolveChatCompletionReasoning({
        hasNativeTools: false,
        model: 'gpt-5.4',
      })
    ).toBeUndefined();
  });

  it('keeps an explicit none effort when tools are present', () => {
    expect(
      resolveChatCompletionReasoning({
        reasoning: { effort: 'none' },
        hasNativeTools: true,
        model: 'google-gemini-2.5-pro',
      })
    ).toEqual({ effort: 'none' });
  });
});
