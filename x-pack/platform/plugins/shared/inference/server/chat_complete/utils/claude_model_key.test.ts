/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getClaudeModelKey, isClaudeModelId } from './claude_model_key';

describe('isClaudeModelId', () => {
  ['claude-sonnet-4-5', 'eu.anthropic.claude-sonnet-5-5', 'anthropic-claude-4.6-sonnet'].forEach(
    (modelId) => {
      it(`returns true for ${modelId}`, () => {
        expect(isClaudeModelId(modelId)).toBe(true);
      });
    }
  );

  ['gpt-5', 'gemini-2.5-pro', 'anthropic/claudette', 'other-provider/model-5'].forEach(
    (modelId) => {
      it(`returns false for ${modelId}`, () => {
        expect(isClaudeModelId(modelId)).toBe(false);
      });
    }
  );
});

describe('getClaudeModelKey', () => {
  const cases: Array<[string, string]> = [
    // variant-first ids (Anthropic, Bedrock, Vertex)
    ['claude-sonnet-4-5', 'sonnet-4-5'],
    ['claude-sonnet-4_6', 'sonnet-4-6'],
    ['claude-opus-4.5-20251101', 'opus-4-5'],
    ['anthropic/claude-sonnet-4.5-20250929', 'sonnet-4-5'],
    ['us.anthropic.claude-opus-4-1-v1:0', 'opus-4-1'],
    ['us.anthropic.claude-opus-4_8-v1:0', 'opus-4-8'],
    ['eu.anthropic.claude-sonnet-5-5', 'sonnet-5-5'],
    ['eu.anthropic.claude-opus-5-5', 'opus-5-5'],
    ['claude-sonnet-4-20250514', 'sonnet-4'],
    ['claude-opus-5', 'opus-5'],
    ['anthropic/claude_fable_5-20260701', 'fable-5'],
    ['claude-fable-5-1', 'fable-5-1'],
    ['anthropic.claude-mythos-5', 'mythos-5'],
    // version-first ids (EIS)
    ['anthropic-claude-4.6-sonnet', 'sonnet-4-6'],
    ['anthropic-claude-5.5-sonnet', 'sonnet-5-5'],
    ['.anthropic-claude-5.5-sonnet-chat_completion', 'sonnet-5-5'],
    ['anthropic-claude-5.1-fable', 'fable-5-1'],
    ['claude-3-5-sonnet-20241022', 'sonnet-3-5'],
    ['claude-3-opus-20240229', 'opus-3'],
  ];

  cases.forEach(([modelId, expected]) => {
    it(`maps ${modelId} to ${expected}`, () => {
      expect(getClaudeModelKey(modelId)).toBe(expected);
    });
  });

  ['gpt-5', 'claude', 'claude-instant-1', 'anthropic.claude-v2'].forEach((modelId) => {
    it(`returns undefined for ${modelId}`, () => {
      expect(getClaudeModelKey(modelId)).toBeUndefined();
    });
  });
});
