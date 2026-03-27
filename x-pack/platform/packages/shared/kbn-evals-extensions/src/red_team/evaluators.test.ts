/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRedTeamEvaluators } from './evaluators';

describe('getRedTeamEvaluators', () => {
  it('returns an array of evaluators', () => {
    const evaluators = getRedTeamEvaluators();

    expect(Array.isArray(evaluators)).toBe(true);
    expect(evaluators.length).toBeGreaterThan(0);
  });

  it('includes guardrails evaluator', () => {
    const evaluators = getRedTeamEvaluators();
    const guardrails = evaluators.find((e) => e.name === 'guardrails');

    expect(guardrails).toBeDefined();
    expect(guardrails!.kind).toBe('CODE');
  });

  it('includes prompt-leak-detection evaluator', () => {
    const evaluators = getRedTeamEvaluators();
    const promptLeak = evaluators.find((e) => e.name === 'prompt-leak-detection');

    expect(promptLeak).toBeDefined();
    expect(promptLeak!.kind).toBe('CODE');
  });

  it('all evaluators have required interface fields', () => {
    const evaluators = getRedTeamEvaluators();

    for (const evaluator of evaluators) {
      expect(typeof evaluator.name).toBe('string');
      expect(['LLM', 'CODE']).toContain(evaluator.kind);
      expect(typeof evaluator.evaluate).toBe('function');
    }
  });

  it('accepts custom guardrail rules', () => {
    const evaluators = getRedTeamEvaluators({
      guardrailRules: [{ name: 'custom', pattern: /custom/, action: 'block' }],
    });

    expect(evaluators.length).toBeGreaterThan(0);
  });

  it('guardrails evaluator detects violations with custom rules', async () => {
    const evaluators = getRedTeamEvaluators({
      guardrailRules: [{ name: 'custom-rule', pattern: /secret-word/, action: 'block' }],
    });
    const guardrails = evaluators.find((e) => e.name === 'guardrails')!;

    const result = await guardrails.evaluate({
      input: { prompt: 'test' },
      output: 'The secret-word is here.',
      expected: undefined,
      metadata: null,
    });

    expect(result.score).toBe(0.0);
  });
});
