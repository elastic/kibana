/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildValidationSummary } from './validation_result_builder';
import type { ServerEvaluatorResult } from '../evaluation_engine';

const mkResult = (
  evaluator: string,
  score: number | null,
  label?: string,
  explanation?: string,
  kind: 'LLM' | 'CODE' = 'LLM'
): ServerEvaluatorResult => ({ evaluator, kind, score, label, explanation });

describe('buildValidationSummary', () => {
  const REQUIRED = ['skill-safety', 'skill-secret-scanner'];
  const THRESHOLD = 0.85;

  it('computes composite score + criteria from per-evaluator results', () => {
    const summary = buildValidationSummary(
      [
        mkResult('skill-relevance', 0.9, 'pass', 'Addresses SOC workflow'),
        mkResult('skill-completeness', 0.8, 'pass'),
        mkResult('skill-accuracy', 0.95, 'pass'),
        mkResult('skill-specificity', 0.7, 'pass'),
        mkResult('skill-safety', 1.0, 'pass'),
        mkResult('skill-secret-scanner', 1.0, 'pass', undefined, 'CODE'),
      ],
      { requiredPass: REQUIRED, compositeThreshold: THRESHOLD }
    );

    expect(summary.score).toBeGreaterThan(0.8);
    expect(summary.criteria.relevance).toBe(0.9);
    expect(summary.criteria.completeness).toBe(0.8);
    expect(summary.criteria.safety).toBe(1.0);
    expect(summary.passed).toBe(true);
    expect(summary.gate.failedRequired).toEqual([]);
    expect(summary.strengths.length).toBeGreaterThan(0);
  });

  it('fails the gate when a required evaluator fails', () => {
    const summary = buildValidationSummary(
      [
        mkResult('skill-relevance', 1.0, 'pass'),
        mkResult('skill-completeness', 1.0, 'pass'),
        mkResult('skill-accuracy', 1.0, 'pass'),
        mkResult('skill-specificity', 1.0, 'pass'),
        mkResult('skill-safety', 1.0, 'pass'),
        mkResult('skill-secret-scanner', 0.0, 'fail', '2 leaked API keys', 'CODE'),
      ],
      { requiredPass: REQUIRED, compositeThreshold: THRESHOLD }
    );

    expect(summary.passed).toBe(false);
    expect(summary.gate.failedRequired).toContain('skill-secret-scanner');
    expect(summary.weaknesses.some((w) => w.includes('secret-scanner'))).toBe(true);
  });

  it('ignores skipped evaluators when computing strengths/weaknesses', () => {
    const summary = buildValidationSummary(
      [
        mkResult('skill-relevance', 0.9, 'pass'),
        mkResult('skill-safety', 1.0, 'pass'),
        mkResult('skill-secret-scanner', 1.0, 'pass', undefined, 'CODE'),
        mkResult('esql-compile', null, 'skipped', 'No ES|QL queries found', 'CODE'),
      ],
      { requiredPass: REQUIRED, compositeThreshold: THRESHOLD }
    );

    expect(summary.strengths.every((s) => !s.includes('esql-compile'))).toBe(true);
    expect(summary.weaknesses.every((w) => !w.includes('esql-compile'))).toBe(true);
    expect(summary.criteria['esql-compile']).toBeUndefined();
  });

  it('fails the gate on composite threshold even when required evaluators pass', () => {
    const summary = buildValidationSummary(
      [
        mkResult('skill-relevance', 0.3, 'fail'),
        mkResult('skill-completeness', 0.4, 'fail'),
        mkResult('skill-accuracy', 0.5, 'fail'),
        mkResult('skill-specificity', 0.4, 'fail'),
        mkResult('skill-safety', 1.0, 'pass'),
        mkResult('skill-secret-scanner', 1.0, 'pass', undefined, 'CODE'),
      ],
      { requiredPass: REQUIRED, compositeThreshold: THRESHOLD }
    );

    expect(summary.passed).toBe(false);
    // Required evaluators actually passed; failure is due to composite.
    expect(summary.gate.failedRequired).toEqual([]);
    expect(summary.gate.reason).toContain('Composite score');
  });

  it('feedback is a short one-liner referencing gate status', () => {
    const summary = buildValidationSummary(
      [mkResult('skill-safety', 1.0, 'pass'), mkResult('skill-secret-scanner', 1.0, 'pass', undefined, 'CODE')],
      { requiredPass: REQUIRED, compositeThreshold: THRESHOLD }
    );

    expect(summary.feedback).toMatch(/Composite/);
    expect(summary.feedback.split('\n').length).toBe(1);
  });
});
