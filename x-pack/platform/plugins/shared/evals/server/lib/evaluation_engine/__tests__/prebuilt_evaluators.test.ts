/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrebuiltEvaluators } from '../prebuilt_evaluators';
import type { ServerEvaluator, ServerEvaluatorParams } from '../evaluator_registry';

const findEvaluator = (name: string): ServerEvaluator => {
  const evaluator = getPrebuiltEvaluators().find((e) => e.name === name);
  if (!evaluator) {
    throw new Error(`Prebuilt evaluator "${name}" not registered`);
  }
  return evaluator;
};

const buildParams = (responses: Array<string | { content?: string }>): ServerEvaluatorParams => {
  const queue = [...responses];
  return {
    input: { name: 'skill', description: 'd', markdown: '# s' },
    output: '# skill',
    inferenceClient: {
      chatComplete: jest.fn(async () => {
        const next = queue.shift();
        return typeof next === 'string' ? { content: next } : next ?? { content: '' };
      }),
    },
  };
};

describe('prebuilt_evaluators: skill-quality-ensemble', () => {
  const ensemble = findEvaluator('skill-quality-ensemble');

  it('aggregates five judge scores using median and reports low disagreement when they agree', async () => {
    const responses = [
      '{"score": 0.9, "explanation": "good"}',
      '{"score": 0.92, "explanation": "good"}',
      '{"score": 0.88, "explanation": "good"}',
      '{"score": 0.91, "explanation": "good"}',
      '{"score": 0.9, "explanation": "good"}',
    ];
    const result = await ensemble.evaluate(buildParams(responses));

    expect(result.evaluator).toBe('skill-quality-ensemble');
    expect(result.kind).toBe('LLM');
    expect(result.score).toBeGreaterThan(0.85);
    expect(result.score).toBeLessThan(0.95);
    expect(result.label).toBe('pass');
    expect(result.metadata?.validJudgeCount).toBe(5);
    expect(result.metadata?.disagreement as number).toBeLessThan(0.05);
    expect(result.metadata?.agreement as number).toBeGreaterThan(0.9);
    const breakdown = result.metadata?.breakdown as Array<{ evaluator: string }>;
    expect(breakdown).toHaveLength(5);
    expect(breakdown.map((b) => b.evaluator)).toEqual([
      'skill-relevance',
      'skill-completeness',
      'skill-accuracy',
      'skill-specificity',
      'skill-safety',
    ]);
  });

  it('flags disagreement when judges sharply disagree', async () => {
    const responses = [
      '{"score": 0.1, "explanation": "bad"}',
      '{"score": 0.95, "explanation": "great"}',
      '{"score": 0.2, "explanation": "bad"}',
      '{"score": 0.9, "explanation": "great"}',
      '{"score": 0.5, "explanation": "mixed"}',
    ];
    const result = await ensemble.evaluate(buildParams(responses));

    expect(result.label).toBe('disagreement');
    expect(result.metadata?.disagreement as number).toBeGreaterThan(0.2);
    expect(result.explanation).toContain('Judges disagree');
  });

  it('returns null score when all judges fail to parse', async () => {
    const result = await ensemble.evaluate(
      buildParams(['not-json', 'not-json', 'not-json', 'not-json', 'not-json'])
    );

    expect(result.score).toBeNull();
    expect(result.label).toBe('error');
    expect(result.metadata?.disagreement).toBeNull();
  });

  it('aggregates partial valid judges when some fail', async () => {
    const responses = [
      '{"score": 0.9, "explanation": "good"}',
      'garbage',
      '{"score": 0.8, "explanation": "good"}',
      'garbage',
      '{"score": 0.85, "explanation": "good"}',
    ];
    const result = await ensemble.evaluate(buildParams(responses));

    expect(result.score).not.toBeNull();
    expect(result.metadata?.validJudgeCount).toBe(3);
  });
});
