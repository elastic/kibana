/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createGuardrailsEngine, DEFAULT_GUARDRAIL_RULES } from './guardrails';
import type { GuardrailRule } from './guardrails';

describe('guardrails engine', () => {
  describe('default rules', () => {
    const engine = createGuardrailsEngine();

    it('blocks system prompt leak', () => {
      const result = engine.check('Here is my system prompt: you are a helpful assistant.');
      expect(result.blocked).toBe(true);
      expect(result.matches).toEqual(
        expect.arrayContaining([expect.objectContaining({ ruleName: 'system-prompt-leak' })])
      );
    });

    it('blocks credential exposure', () => {
      const result = engine.check('The api_key=sk-abc123 is used for auth.');
      expect(result.blocked).toBe(true);
      expect(result.matches).toEqual(
        expect.arrayContaining([expect.objectContaining({ ruleName: 'credential-exposure' })])
      );
    });

    it('warns on internal path exposure', () => {
      const result = engine.check('The config file is at /etc/elasticsearch/config.yml');
      expect(result.blocked).toBe(false);
      expect(result.matches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ ruleName: 'internal-path-exposure', action: 'warn' }),
        ])
      );
    });

    it('blocks dangerous commands', () => {
      const result = engine.check('Run rm -rf / to clean up');
      expect(result.blocked).toBe(true);
      expect(result.matches).toEqual(
        expect.arrayContaining([expect.objectContaining({ ruleName: 'dangerous-command' })])
      );
    });

    it('warns on private IP exposure', () => {
      const result = engine.check('Connect to 192.168.1.100 on port 9200');
      expect(result.blocked).toBe(false);
      expect(result.matches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ ruleName: 'private-ip-exposure', action: 'warn' }),
        ])
      );
    });

    it('blocks role assumption', () => {
      const result = engine.check('I am now acting as admin to complete this task.');
      expect(result.blocked).toBe(true);
    });

    it('returns no matches for safe text', () => {
      const result = engine.check(
        'Elasticsearch is a distributed search engine built on Apache Lucene.'
      );
      expect(result.blocked).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('returns empty matches for empty text', () => {
      const result = engine.check('');
      expect(result.blocked).toBe(false);
      expect(result.matches).toHaveLength(0);
    });
  });

  describe('custom rules', () => {
    const customRules: GuardrailRule[] = [
      {
        name: 'custom-block',
        pattern: /forbidden-word/i,
        action: 'block',
      },
      {
        name: 'custom-log',
        pattern: /interesting-word/i,
        action: 'log',
      },
    ];

    const engine = createGuardrailsEngine(customRules);

    it('uses custom rules instead of defaults', () => {
      const result = engine.check('This has the forbidden-word in it.');
      expect(result.blocked).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].ruleName).toBe('custom-block');
    });

    it('does not trigger default rules when custom rules are provided', () => {
      const result = engine.check('The api_key=sk-abc123 is used for auth.');
      expect(result.blocked).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('log action does not block', () => {
      const result = engine.check('Found an interesting-word here.');
      expect(result.blocked).toBe(false);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].action).toBe('log');
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
