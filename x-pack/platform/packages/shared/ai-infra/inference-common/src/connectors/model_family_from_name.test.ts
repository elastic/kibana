/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelFamily } from '../model_provider';
import { getModelFamilyFromName } from './model_family_from_name';

describe('getModelFamilyFromName', () => {
  describe('EIS model ids (the names that were all mis-attributed to Claude)', () => {
    it.each([
      ['anthropic-claude-5-sonnet', ModelFamily.Claude],
      ['anthropic-claude-4.6-sonnet', ModelFamily.Claude],
      ['anthropic-claude-4.8-opus', ModelFamily.Claude],
      ['anthropic-claude-4.5-haiku', ModelFamily.Claude],
      ['google-gemini-3.1-pro', ModelFamily.Gemini],
      ['google-gemini-3.0-flash', ModelFamily.Gemini],
      ['google-gemini-2.5-pro', ModelFamily.Gemini],
      ['google-gemini-3.5-flash', ModelFamily.Gemini],
      ['openai-gpt-5.5', ModelFamily.GPT],
      ['openai-gpt-5.4-mini', ModelFamily.GPT],
      ['openai-gpt-oss-120b', ModelFamily.GPT],
      ['openai-gpt-oss-20b', ModelFamily.GPT],
    ])('resolves %s to %s', (modelName, expected) => {
      expect(getModelFamilyFromName(modelName)).toBe(expected);
    });
  });

  describe('versions newer than the knownModels table', () => {
    // The table stops at gemini-2.5 / gpt-4.1 / claude-4.6. These must still resolve,
    // otherwise every new release silently regresses to the provider-derived default.
    it.each([
      ['google-gemini-9.9-pro', ModelFamily.Gemini],
      ['openai-gpt-12', ModelFamily.GPT],
      ['anthropic-claude-7-sonnet', ModelFamily.Claude],
    ])('resolves unreleased %s to %s', (modelName, expected) => {
      expect(getModelFamilyFromName(modelName)).toBe(expected);
    });
  });

  describe('name shapes', () => {
    it('is case insensitive', () => {
      expect(getModelFamilyFromName('GOOGLE-GEMINI-3.1-PRO')).toBe(ModelFamily.Gemini);
    });

    it('accepts dot and underscore separators', () => {
      expect(getModelFamilyFromName('openai_gpt_oss_120b')).toBe(ModelFamily.GPT);
      expect(getModelFamilyFromName('google.gemini.3.1.pro')).toBe(ModelFamily.Gemini);
    });

    it('attributes an Anthropic size variant by family, not by variant', () => {
      expect(getModelFamilyFromName('sonnet-latest')).toBe(ModelFamily.Claude);
      expect(getModelFamilyFromName('opus-latest')).toBe(ModelFamily.Claude);
    });

    it('resolves o-series reasoning models to GPT', () => {
      expect(getModelFamilyFromName('o3-mini')).toBe(ModelFamily.GPT);
      expect(getModelFamilyFromName('o4-mini')).toBe(ModelFamily.GPT);
    });
  });

  describe('unknown names', () => {
    it.each([['gp-llm-v2'], ['some-internal-model'], ['']])(
      'returns undefined for %s rather than guessing',
      (modelName) => {
        expect(getModelFamilyFromName(modelName)).toBeUndefined();
      }
    );

    it('does not match a family token embedded in an unrelated word', () => {
      // `crypto` contains no family token; `gptx` is not a `gpt` word boundary.
      expect(getModelFamilyFromName('encrypto-model')).toBeUndefined();
    });
  });
});
