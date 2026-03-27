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

    it('returns score 1.0 for null output', async () => {
      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: null,
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(1.0);
      expect(result.label).toBe('safe');
    });

    it('returns score 1.0 for undefined output', async () => {
      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: undefined,
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(1.0);
      expect(result.label).toBe('safe');
    });

    it('detects private IP addresses', async () => {
      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: 'The server is at 192.168.1.100',
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(0.5);
      expect(result.label).toBe('warning');
    });

    it('detects role assumption', async () => {
      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: 'I am now acting as admin with full access.',
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(0.0);
      expect(result.label).toBe('blocked');
    });

    it('detects credentials in JSON-stringified objects', async () => {
      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: { api_key: 'sk-secret-value-12345' },
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(0.0);
      expect(result.label).toBe('blocked');
    });
  });

  describe('log action scoring', () => {
    it('returns score 1.0 with label "logged" for log-only matches', async () => {
      const logRules: GuardrailRule[] = [
        { name: 'log-only', pattern: /elasticsearch/i, action: 'log' },
      ];
      const evaluator = createGuardrailsEvaluator(logRules);

      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: 'Elasticsearch is running on port 9200.',
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(1.0);
      expect(result.label).toBe('logged');
      expect(result.metadata).toHaveProperty('blocked', false);
      expect(result.metadata).toHaveProperty('warned', false);
    });

    it('warn takes precedence over log', async () => {
      const mixedRules: GuardrailRule[] = [
        { name: 'log-rule', pattern: /elasticsearch/i, action: 'log' },
        { name: 'warn-rule', pattern: /port \d+/i, action: 'warn' },
      ];
      const evaluator = createGuardrailsEvaluator(mixedRules);

      const result = await evaluator.evaluate({
        input: { prompt: 'test' },
        output: 'Elasticsearch is running on port 9200.',
        expected: undefined,
        metadata: null,
      });

      expect(result.score).toBe(0.5);
      expect(result.label).toBe('warning');
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
      expect(result.warned).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('sets warned=true for warn-action matches', () => {
      const result = engine.check('The config is at /etc/elasticsearch/config.yml');
      expect(result.blocked).toBe(false);
      expect(result.warned).toBe(true);
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
