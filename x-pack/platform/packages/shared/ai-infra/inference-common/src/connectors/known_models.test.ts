/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getModelDefinition } from './known_models';

describe('getModelDefinition', () => {
  describe('OpenAI', () => {
    it('resolves common GPT-4 model ids', () => {
      expect(getModelDefinition('gpt-4o')!.id).toBe('gpt-4o');
      expect(getModelDefinition('gpt-4o-mini')!.id).toBe('gpt-4o-mini');
      expect(getModelDefinition('gpt-4.1')!.id).toBe('gpt-4.1');
      expect(getModelDefinition('gpt-4.1-mini')!.id).toBe('gpt-4.1-mini');
    });

    it('resolves GPT-5 family ids specifically, not to the bare `gpt-5`', () => {
      expect(getModelDefinition('gpt-5')!.id).toBe('gpt-5');
      expect(getModelDefinition('gpt-5-mini')!.id).toBe('gpt-5-mini');
      expect(getModelDefinition('gpt-5-nano')!.id).toBe('gpt-5-nano');
      expect(getModelDefinition('gpt-5.4')!.id).toBe('gpt-5.4');
      expect(getModelDefinition('gpt-5.4-mini')!.id).toBe('gpt-5.4-mini');
      expect(getModelDefinition('gpt-5.5-2026-04-23')!.id).toBe('gpt-5.5');
      expect(getModelDefinition('gpt-5.6-sol')!.id).toBe('gpt-5.6-sol');
      expect(getModelDefinition('gpt-5.6-terra')!.id).toBe('gpt-5.6-terra');
      expect(getModelDefinition('gpt-5.6-luna')!.id).toBe('gpt-5.6-luna');
    });

    it('resolves the EIS-prefixed GPT ids', () => {
      expect(getModelDefinition('openai-gpt-5.4-mini')!.id).toBe('gpt-5.4-mini');
      expect(getModelDefinition('.openai-gpt-5.6-luna-chat_completion')!.id).toBe('gpt-5.6-luna');
      expect(getModelDefinition('openai-gpt-oss-120b')!.id).toBe('gpt-oss-120b');
    });
  });

  describe('Anthropic — version-first (EIS / older API)', () => {
    it('resolves EIS-prefixed Claude ids to the canonical family-first id via aliases', () => {
      // EIS uses version-first (`anthropic-claude-4.6-sonnet`); those resolve through the
      // `aliases` array to the family-first canonical id (Bedrock / Anthropic direct / Vertex).
      expect(getModelDefinition('anthropic-claude-5-sonnet')!.id).toBe('claude-sonnet-5');
      expect(getModelDefinition('anthropic-claude-5-opus')!.id).toBe('claude-opus-5');
      expect(getModelDefinition('anthropic-claude-4.6-sonnet')!.id).toBe('claude-sonnet-4-6');
      expect(getModelDefinition('anthropic-claude-4.6-opus')!.id).toBe('claude-opus-4-6');
      expect(getModelDefinition('anthropic-claude-4.5-haiku')!.id).toBe('claude-haiku-4-5');
      expect(getModelDefinition('anthropic-claude-4.5-sonnet')!.id).toBe('claude-sonnet-4-5');
      expect(getModelDefinition('anthropic-claude-4.7-opus')!.id).toBe('claude-opus-4-7');
      expect(getModelDefinition('anthropic-claude-4.8-opus')!.id).toBe('claude-opus-4-8');
      expect(getModelDefinition('anthropic-claude-5.1-fable')!.id).toBe('claude-fable-5-1');
    });

    it('resolves older Claude-3 API ids via dash-replacement', () => {
      expect(getModelDefinition('anthropic.claude-3-opus-20240229-v1:0')!.id).toBe('claude-3-opus');
      expect(getModelDefinition('anthropic.claude-3-5-sonnet-20241022-v2:0')!.id).toBe(
        'claude-3.5-sonnet'
      );
      expect(getModelDefinition('us.anthropic.claude-3-7-sonnet-20250219-v1:0')!.id).toBe(
        'claude-3.7-sonnet'
      );
    });
  });

  describe('Anthropic — family-first (native / Bedrock / Vertex, Claude 4+)', () => {
    it('resolves Bedrock ids for Claude 4 with the dated form', () => {
      expect(getModelDefinition('us.anthropic.claude-sonnet-4-20250514-v1:0')!.id).toBe(
        'claude-sonnet-4'
      );
      expect(getModelDefinition('us.anthropic.claude-opus-4-20250514-v1:0')!.id).toBe(
        'claude-opus-4'
      );
      expect(getModelDefinition('anthropic.claude-opus-4-1-20250805-v1:0')!.id).toBe(
        'claude-opus-4-1'
      );
    });

    it('resolves Bedrock ids for Claude 4.5 with the dated form', () => {
      expect(getModelDefinition('us.anthropic.claude-sonnet-4-5-20250929-v1:0')!.id).toBe(
        'claude-sonnet-4-5'
      );
      expect(getModelDefinition('anthropic.claude-haiku-4-5-20251001-v1:0')!.id).toBe(
        'claude-haiku-4-5'
      );
    });

    it('resolves Bedrock ids for Claude 4.6+ with the dateless form', () => {
      expect(getModelDefinition('anthropic.claude-sonnet-4-6')!.id).toBe('claude-sonnet-4-6');
      expect(getModelDefinition('anthropic.claude-opus-4-6-v1')!.id).toBe('claude-opus-4-6');
      expect(getModelDefinition('anthropic.claude-opus-4-7')!.id).toBe('claude-opus-4-7');
      expect(getModelDefinition('anthropic.claude-opus-4-8')!.id).toBe('claude-opus-4-8');
    });

    it('resolves Bedrock ids for Claude 5 and Fable', () => {
      expect(getModelDefinition('anthropic.claude-sonnet-5')!.id).toBe('claude-sonnet-5');
      expect(getModelDefinition('anthropic.claude-opus-5')!.id).toBe('claude-opus-5');
      expect(getModelDefinition('anthropic.claude-fable-5-1')!.id).toBe('claude-fable-5-1');
    });

    it('picks the more-specific id before the less-specific one', () => {
      // Guard against the family-first ordering trap: `claude-opus-4-1` must resolve to itself,
      // not to the shorter `claude-opus-4` substring.
      expect(getModelDefinition('claude-opus-4-1-20250805')!.id).toBe('claude-opus-4-1');
      expect(getModelDefinition('claude-opus-4-6')!.id).toBe('claude-opus-4-6');
      expect(getModelDefinition('claude-opus-4-7')!.id).toBe('claude-opus-4-7');
      expect(getModelDefinition('claude-opus-4-8')!.id).toBe('claude-opus-4-8');
      expect(getModelDefinition('claude-sonnet-4-5-20250929')!.id).toBe('claude-sonnet-4-5');
      expect(getModelDefinition('claude-sonnet-4-6')!.id).toBe('claude-sonnet-4-6');
    });
  });

  describe('Google — Gemini', () => {
    it('resolves common Gemini ids', () => {
      expect(getModelDefinition('gemini-1.5-pro-preview-0409')!.id).toBe('gemini-1.5-pro');
      expect(getModelDefinition('gemini-2.0-flash-001')!.id).toBe('gemini-2.0-flash');
      expect(getModelDefinition('gemini-2.5-pro-001')!.id).toBe('gemini-2.5-pro');
    });

    it('picks flash-lite before flash', () => {
      expect(getModelDefinition('gemini-2.5-flash-lite')!.id).toBe('gemini-2.5-flash-lite');
      expect(getModelDefinition('gemini-3.5-flash-lite')!.id).toBe('gemini-3.5-flash-lite');
      expect(getModelDefinition('gemini-3.1-flash-lite')!.id).toBe('gemini-3.1-flash-lite');
    });

    it('resolves the current Gemini 3.x lineup', () => {
      expect(getModelDefinition('google-gemini-3.0-flash')!.id).toBe('gemini-3.0-flash');
      expect(getModelDefinition('google-gemini-3.1-pro')!.id).toBe('gemini-3.1-pro');
      expect(getModelDefinition('google-gemini-3.5-flash')!.id).toBe('gemini-3.5-flash');
      expect(getModelDefinition('google-gemini-3.6-flash')!.id).toBe('gemini-3.6-flash');
      expect(getModelDefinition('google-gemini-3.7-flash')!.id).toBe('gemini-3.7-flash');
      // Vertex `gemini-3-pro-preview` resolves through the bare `gemini-3-pro` id.
      expect(getModelDefinition('gemini-3-pro-preview')!.id).toBe('gemini-3-pro');
    });
  });

  describe('contextWindow', () => {
    // Corrections landed in this PR — regressing any of these would silently break the compaction
    // trigger downstream, so pin the exact values.
    it('resolves corrected windows', () => {
      // Sonnet 4 and 4.5: 200k default (1M is beta-header only, which we don't send).
      expect(getModelDefinition('us.anthropic.claude-sonnet-4-20250514-v1:0')).toMatchObject({
        id: 'claude-sonnet-4',
        contextWindow: 200000,
      });
      expect(getModelDefinition('us.anthropic.claude-sonnet-4-5-20250929-v1:0')).toMatchObject({
        id: 'claude-sonnet-4-5',
        contextWindow: 200000,
      });
      expect(getModelDefinition('anthropic-claude-4.5-sonnet')).toMatchObject({
        id: 'claude-sonnet-4-5',
        contextWindow: 200000,
      });
      // Opus 4.6: 1M native (correction from a pre-PR 200k).
      expect(getModelDefinition('anthropic-claude-4.6-opus')).toMatchObject({
        id: 'claude-opus-4-6',
        contextWindow: 1000000,
      });
      expect(getModelDefinition('anthropic.claude-opus-4-6-v1')).toMatchObject({
        id: 'claude-opus-4-6',
        contextWindow: 1000000,
      });
    });

    it('resolves newly-added Claude models to the right window', () => {
      // Sonnet 4.6 / Opus 4.7 / Opus 4.8 / Claude 5 family: 1M native.
      expect(getModelDefinition('anthropic-claude-4.6-sonnet')).toMatchObject({
        id: 'claude-sonnet-4-6',
        contextWindow: 1000000,
      });
      expect(getModelDefinition('anthropic-claude-4.7-opus')).toMatchObject({
        id: 'claude-opus-4-7',
        contextWindow: 1000000,
      });
      expect(getModelDefinition('anthropic.claude-opus-4-8')).toMatchObject({
        id: 'claude-opus-4-8',
        contextWindow: 1000000,
      });
      expect(getModelDefinition('anthropic-claude-5-sonnet')).toMatchObject({
        id: 'claude-sonnet-5',
        contextWindow: 1000000,
      });
      expect(getModelDefinition('anthropic-claude-5.1-fable')).toMatchObject({
        id: 'claude-fable-5-1',
        contextWindow: 1000000,
      });
      // Opus 4.1 and Haiku 4.5: 200k (Opus and Haiku family defaults, no beta).
      expect(getModelDefinition('anthropic.claude-opus-4-1-20250805-v1:0')).toMatchObject({
        id: 'claude-opus-4-1',
        contextWindow: 200000,
      });
      expect(getModelDefinition('anthropic-claude-4.5-haiku')).toMatchObject({
        id: 'claude-haiku-4-5',
        contextWindow: 200000,
      });
    });

    it('resolves newly-added OpenAI models to the right window', () => {
      // GPT-5 family: 400k. GPT-5.5 / 5.6: 1.05M. GPT-OSS: 128k.
      expect(getModelDefinition('gpt-5')).toMatchObject({ id: 'gpt-5', contextWindow: 400000 });
      expect(getModelDefinition('gpt-5-mini')).toMatchObject({
        id: 'gpt-5-mini',
        contextWindow: 400000,
      });
      expect(getModelDefinition('gpt-5.4-nano')).toMatchObject({
        id: 'gpt-5.4-nano',
        contextWindow: 400000,
      });
      expect(getModelDefinition('gpt-5.5-2026-04-23')).toMatchObject({
        id: 'gpt-5.5',
        contextWindow: 1050000,
      });
      expect(getModelDefinition('gpt-5.6-sol')).toMatchObject({
        id: 'gpt-5.6-sol',
        contextWindow: 1050000,
      });
      expect(getModelDefinition('openai-gpt-oss-120b')).toMatchObject({
        id: 'gpt-oss-120b',
        contextWindow: 128000,
      });
    });

    it('resolves newly-added Gemini models to the right window', () => {
      expect(getModelDefinition('google-gemini-3.0-flash')).toMatchObject({
        id: 'gemini-3.0-flash',
        contextWindow: 1000000,
      });
      expect(getModelDefinition('google-gemini-3.7-flash')).toMatchObject({
        id: 'gemini-3.7-flash',
        contextWindow: 1000000,
      });
      expect(getModelDefinition('gemini-3-pro-preview')).toMatchObject({
        id: 'gemini-3-pro',
        contextWindow: 1000000,
      });
      expect(getModelDefinition('gemini-2.5-flash-lite')).toMatchObject({
        id: 'gemini-2.5-flash-lite',
        contextWindow: 1000000,
      });
    });
  });

  it('returns undefined for an unknown model id', () => {
    expect(getModelDefinition('unknown-model-id')).toBeUndefined();
  });
});
