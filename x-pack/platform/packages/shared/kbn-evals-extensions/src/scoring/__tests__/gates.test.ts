/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluateCiGates } from '../gates';
import type { CiGateConfig } from '../../types';

describe('evaluateCiGates', () => {
  const baseResults = [
    { evaluator: 'skill-safety', score: 1.0 },
    { evaluator: 'skill-accuracy', score: 0.85 },
    { evaluator: 'skill-relevance', score: 0.9 },
    { evaluator: 'backing-index-validator', score: 1.0 },
  ];

  it('should pass when all gates are met', () => {
    const config: CiGateConfig = {
      compositeThreshold: 0.8,
      requiredPass: ['skill-safety', 'backing-index-validator'],
      perEvaluator: { 'skill-accuracy': { min: 0.7 } },
    };

    const result = evaluateCiGates(baseResults, 0.9, config);
    expect(result.passed).toBe(true);
    expect(result.failedGates).toHaveLength(0);
  });

  it('should fail on composite threshold violation', () => {
    const config: CiGateConfig = { compositeThreshold: 0.95 };
    const result = evaluateCiGates(baseResults, 0.85, config);

    expect(result.passed).toBe(false);
    expect(result.failedGates).toHaveLength(1);
    expect(result.failedGates[0].gate).toBe('composite-threshold');
    expect(result.failedGates[0].expected).toBe(0.95);
    expect(result.failedGates[0].actual).toBe(0.85);
  });

  it('should pass required-pass when score > 0', () => {
    const results = [
      { evaluator: 'skill-safety', score: 0.5 }, // non-zero = passes required-pass
      { evaluator: 'backing-index-validator', score: 1.0 },
    ];
    const config: CiGateConfig = { requiredPass: ['skill-safety'] };

    const result = evaluateCiGates(results, 0.9, config);
    expect(result.passed).toBe(true);
    expect(result.failedGates).toHaveLength(0);
  });

  it('should fail on required-pass when score is 0', () => {
    const results = [
      { evaluator: 'skill-safety', score: 0 }, // zero = failed
      { evaluator: 'backing-index-validator', score: 1.0 },
    ];
    const config: CiGateConfig = { requiredPass: ['skill-safety'] };

    const result = evaluateCiGates(results, 0.9, config);
    expect(result.passed).toBe(false);
    expect(result.failedGates[0].gate).toBe('required-pass');
    expect(result.failedGates[0].evaluator).toBe('skill-safety');
  });

  it('should fail on required-pass with null score', () => {
    const results = [{ evaluator: 'skill-safety', score: null }];
    const config: CiGateConfig = { requiredPass: ['skill-safety'] };

    const result = evaluateCiGates(results, 0.9, config);
    expect(result.passed).toBe(false);
    expect(result.failedGates[0].gate).toBe('required-pass');
  });

  it('should fail on per-evaluator minimum violation', () => {
    const results = [{ evaluator: 'skill-accuracy', score: 0.5 }];
    const config: CiGateConfig = {
      perEvaluator: { 'skill-accuracy': { min: 0.7 } },
    };

    const result = evaluateCiGates(results, 0.9, config);
    expect(result.passed).toBe(false);
    expect(result.failedGates[0].gate).toBe('per-evaluator-min');
    expect(result.failedGates[0].evaluator).toBe('skill-accuracy');
  });

  it('should report multiple failures', () => {
    const results = [
      { evaluator: 'skill-safety', score: 0 }, // zero = required-pass fails
      { evaluator: 'skill-accuracy', score: 0.4 },
    ];
    const config: CiGateConfig = {
      compositeThreshold: 0.9,
      requiredPass: ['skill-safety'],
      perEvaluator: { 'skill-accuracy': { min: 0.7 } },
    };

    const result = evaluateCiGates(results, 0.5, config);
    expect(result.passed).toBe(false);
    expect(result.failedGates.length).toBe(3); // composite + required-pass + per-evaluator
  });

  it('should pass with empty config', () => {
    const result = evaluateCiGates(baseResults, 0.5, {});
    expect(result.passed).toBe(true);
  });
});
