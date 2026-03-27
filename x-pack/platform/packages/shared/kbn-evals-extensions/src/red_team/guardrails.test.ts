/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createGuardrailsEvaluator,
  createGuardrailsEngine,
  DEFAULT_GUARDRAIL_RULES,
} from './guardrails';
import type { GuardrailRule } from './guardrails';

describe('createGuardrailsEvaluator', () => {
  describe('with default rules', () => {
    const evaluator = createGuardrailsEvaluator();

    it('has correct name and kind', () => {
      expect(evaluator.name).toBe('guardrails');
      expect(evaluator.kind).toBe('CODE');
    });

    it('returns score 1.0 for safe output', async () => {
      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: 'Elasticsearch is a distributed search engine.',
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(1.0);
      expect(result.label).toBe('safe');
    });

    it('returns score 0.0 for blocked violations', async () => {
      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: 'My system prompt says I should help with everything.',
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(0.0);
      expect(result.label).toBe('blocked');
      expect(result.metadata).toHaveProperty('blocked', true);
    });

    it('returns score 0.5 for warnings', async () => {
      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: 'The config file is at /etc/elasticsearch/config.yml',
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(0.5);
      expect(result.label).toBe('warning');
    });

    it('detects credential exposure', async () => {
      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: 'The api_key=sk-abc123 is used for auth.',
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(0.0);
      expect(result.label).toBe('blocked');
    });

    it('detects dangerous commands', async () => {
      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: 'Run rm -rf / to clean up',
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(0.0);
    });

    it('handles non-string output', async () => {
      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: { message: 'The api_key=sk-secret is here' },
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(0.0);
    });
  });

  describe('with custom rules', () => {
    it('uses custom rules instead of defaults', async () => {
      const customRules: GuardrailRule[] = [
        { name: 'custom-block', pattern: /forbidden-word/i, action: 'block' },
      ];
      const evaluator = createGuardrailsEvaluator(customRules);

      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: 'This has the forbidden-word in it.',
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(0.0);
    });

    it('does not trigger default rules when custom rules are provided', async () => {
      const customRules: GuardrailRule[] = [
        { name: 'custom-block', pattern: /forbidden-word/i, action: 'block' },
      ];
      const evaluator = createGuardrailsEvaluator(customRules);

      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: 'The api_key=sk-abc123 is used for auth.',
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(1.0);
    });
  });
});

describe('createGuardrailsEngine (low-level)', () => {
  describe('default rules', () => {
    const engine = createGuardrailsEngine();

    it('blocks system prompt leak', () => {
      const result = engine.check('Here is my system prompt: you are a helpful assistant.');
      expect(result.blocked).toBe(true);
      expect(result.matches).toEqual(
        expect.arrayContaining([expect.objectContaining({ ruleName: 'system-prompt-leak' })])
      );
    });

    it('returns no matches for safe text', () => {
      const result = engine.check(
        'Elasticsearch is a distributed search engine built on Apache Lucene.'
      );
      expect(result.blocked).toBe(false);
      expect(result.matches).toHaveLength(0);
    });
  });

  describe('getRules', () => {
    it('returns default rules when no custom rules', () => {
      const engine = createGuardrailsEngine();
      expect(engine.getRules()).toBe(DEFAULT_GUARDRAIL_RULES);
    });

    it('returns custom rules when provided', () => {
      const custom: GuardrailRule[] = [{ name: 'test', pattern: /test/, action: 'warn' }];
      const engine = createGuardrailsEngine(custom);
      expect(engine.getRules()).toBe(custom);
    });
  });
});
