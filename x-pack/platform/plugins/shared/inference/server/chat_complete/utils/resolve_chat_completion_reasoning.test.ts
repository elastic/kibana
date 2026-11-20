/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  resolveChatCompletionReasoning,
  resolveOpenAIReasoningEffort,
} from './resolve_chat_completion_reasoning';

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
      'gpt-5.6-terra',
      'gpt-6-luna',
      '.openai-gpt-6-sol-chat_completion',
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
      'gpt-60',
      'gpt-6-astra',
      'gpt-6-astra-pro',
      'gpt-6.1-sol',
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

  it('skips the default for EIS', () => {
    for (const model of ['openai-gpt-5.6-terra', 'openai-gpt-6-luna', 'openai-gpt-6-astra']) {
      expect(
        resolveChatCompletionReasoning({ hasNativeTools: true, model, isEis: true })
      ).toBeUndefined();
    }
  });

  it('returns the caller-provided reasoning for EIS', () => {
    expect(
      resolveChatCompletionReasoning({
        reasoning: { effort: 'low' },
        hasNativeTools: true,
        model: 'openai-gpt-6-luna',
        isEis: true,
      })
    ).toEqual({ effort: 'low' });
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

describe('resolveOpenAIReasoningEffort', () => {
  it('returns none when native tools are present and the model requires it', () => {
    const models = [
      'gpt-5.6-terra',
      'gpt-5.6-luna-2026-09-01',
      'openai/gpt-5.6-sol',
      'gpt-6-luna',
      'gpt-6-luna-pro',
      'gpt-6-sol',
    ];
    for (const model of models) {
      expect(resolveOpenAIReasoningEffort({ hasNativeTools: true, model })).toBe('none');
    }
  });

  it('returns undefined for models that default to or reject none', () => {
    const models = [
      'gpt-5',
      'gpt-5-mini',
      'gpt-5.4',
      'gpt-5.5',
      'gpt-5.60',
      'gpt-6-astra',
      'gpt-6-astra-pro',
      'gpt-6.1-sol',
      'gpt-4.1',
      'o3-mini',
    ];
    for (const model of models) {
      expect(resolveOpenAIReasoningEffort({ hasNativeTools: true, model })).toBeUndefined();
    }
  });

  it('returns undefined when tools are absent', () => {
    expect(
      resolveOpenAIReasoningEffort({ hasNativeTools: false, model: 'gpt-5.6-terra' })
    ).toBeUndefined();
  });

  it('returns undefined when the model is unknown', () => {
    expect(resolveOpenAIReasoningEffort({ hasNativeTools: true })).toBeUndefined();
  });

  it('returns the caller-provided effort over the none default', () => {
    expect(
      resolveOpenAIReasoningEffort({
        reasoning: { effort: 'high' },
        hasNativeTools: true,
        model: 'gpt-5.6-terra',
      })
    ).toBe('high');
  });

  it('returns the caller-provided effort without tools or a known model', () => {
    expect(
      resolveOpenAIReasoningEffort({ reasoning: { effort: 'low' }, hasNativeTools: false })
    ).toBe('low');
  });

  it('skips the none default when the caller enabled reasoning without an effort', () => {
    expect(
      resolveOpenAIReasoningEffort({
        reasoning: { enabled: true },
        hasNativeTools: true,
        model: 'gpt-5.6-terra',
      })
    ).toBeUndefined();
  });

  it('keeps the none default when the caller reasoning sets neither effort nor enabled', () => {
    expect(
      resolveOpenAIReasoningEffort({
        reasoning: { exclude: true },
        hasNativeTools: true,
        model: 'gpt-5.6-terra',
      })
    ).toBe('none');
  });
});
