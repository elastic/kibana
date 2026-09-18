/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTrajectoryEvaluator } from '.';

describe('createTrajectoryEvaluator', () => {
  const evaluator = createTrajectoryEvaluator({
    extractToolCalls: (output: unknown) => (output as { tools: string[] }).tools,
    goldenPathExtractor: (expected: unknown) => (expected as { tools: string[] }).tools,
  });

  it('returns perfect score for exact match', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: { tools: ['search', 'filter', 'display'] },
      expected: { tools: ['search', 'filter', 'display'] },
      metadata: null,
    });

    expect(result.score).toBe(1.0);
  });

  it('returns 0 when actual is empty but expected is not', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: { tools: [] },
      expected: { tools: ['search', 'filter'] },
      metadata: null,
    });

    expect(result.score).toBe(0);
  });

  it('scores partial match correctly', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: { tools: ['search', 'display'] },
      expected: { tools: ['search', 'filter', 'display'] },
      metadata: null,
    });

    // LCS = ['search', 'display'] → orderScore = 2/3
    // Coverage: search,display in expected → 2/3
    // score = 0.5 * (2/3) + 0.5 * (2/3) = 2/3
    expect(result.score).toBeCloseTo(2 / 3);
  });

  it('penalizes wrong order', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: { tools: ['display', 'filter', 'search'] },
      expected: { tools: ['search', 'filter', 'display'] },
      metadata: null,
    });

    // LCS = ['filter'] (length 1) → orderScore = 1/3
    // Coverage: all 3 in expected → 3/3 = 1
    // score = 0.5 * (1/3) + 0.5 * 1 = ~0.667
    expect(result.score).toBeCloseTo(0.5 * (1 / 3) + 0.5 * 1);
  });

  it('handles both empty sequences', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: { tools: [] },
      expected: { tools: [] },
      metadata: null,
    });

    expect(result.score).toBe(1.0);
  });

  it('reports extra tools', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: { tools: ['search', 'hack', 'display'] },
      expected: { tools: ['search', 'display'] },
      metadata: null,
    });

    expect(result.metadata).toHaveProperty('extraTools', ['hack']);
  });

  it('reports missing tools', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: { tools: ['search'] },
      expected: { tools: ['search', 'filter', 'display'] },
      metadata: null,
    });

    expect(result.metadata).toHaveProperty('missingTools', ['filter', 'display']);
  });

  it('respects custom weights', async () => {
    const customEvaluator = createTrajectoryEvaluator({
      extractToolCalls: (output: unknown) => (output as { tools: string[] }).tools,
      goldenPathExtractor: (expected: unknown) => (expected as { tools: string[] }).tools,
      orderWeight: 1.0,
      coverageWeight: 0.0,
    });

    const result = await customEvaluator.evaluate({
      input: {},
      output: { tools: ['search', 'display'] },
      expected: { tools: ['search', 'filter', 'display'] },
      metadata: null,
    });

    // orderWeight=1, coverageWeight=0 → only LCS matters
    // LCS = ['search', 'display'] → 2/3
    expect(result.score).toBeCloseTo(2 / 3);
  });

  it('throws when weights do not sum to 1', () => {
    expect(() =>
      createTrajectoryEvaluator({
        extractToolCalls: (output: unknown) => (output as { tools: string[] }).tools,
        goldenPathExtractor: (expected: unknown) => (expected as { tools: string[] }).tools,
        orderWeight: 0.3,
        coverageWeight: 0.3,
      })
    ).toThrow('orderWeight (0.3) + coverageWeight (0.3) must sum to 1');
  });

  describe('penalizeExtraCalls', () => {
    const strictEvaluator = createTrajectoryEvaluator({
      extractToolCalls: (output: unknown) => (output as { tools: string[] }).tools,
      goldenPathExtractor: (expected: unknown) => (expected as { tools: string[] }).tools,
      penalizeExtraCalls: true,
    });

    it('leaves extra calls unpenalized by default', async () => {
      const result = await evaluator.evaluate({
        input: {},
        output: { tools: ['search', 'display'] },
        expected: { tools: ['search'] },
        metadata: null,
      });

      // The opt-in flag must not change the default behaviour other suites rely on.
      expect(result.score).toBe(1.0);
      expect(result.metadata).toMatchObject({ precision: 1 });
    });

    it('scales the score down for an extra call', async () => {
      const result = await strictEvaluator.evaluate({
        input: {},
        output: { tools: ['search', 'hack'] },
        expected: { tools: ['search'] },
        metadata: null,
      });

      expect(result.score).toBe(0.5);
      expect(result.label).toBe('extra-or-duplicate-tools');
      expect(result.metadata).toMatchObject({
        precision: 0.5,
        exactSequence: false,
        extraTools: ['hack'],
      });
    });

    it('scales the score down for a duplicated golden call', async () => {
      const result = await strictEvaluator.evaluate({
        input: {},
        output: { tools: ['search', 'search'] },
        expected: { tools: ['search'] },
        metadata: null,
      });

      expect(result.score).toBe(0.5);
      expect(result.metadata).toMatchObject({ duplicateTools: ['search'], extraTools: [] });
    });

    it('does not penalize a shorter actual sequence', async () => {
      const result = await strictEvaluator.evaluate({
        input: {},
        output: { tools: ['search'] },
        expected: { tools: ['search', 'filter'] },
        metadata: null,
      });

      // Missing calls are already reflected by order/coverage; the ratio stays 1.
      expect(result.metadata).toMatchObject({ precision: 1, exactSequence: false });
      expect(result.score).toBeCloseTo(0.5 * 0.5 + 0.5 * 0.5);
    });

    it('keeps a perfect score for the exact sequence', async () => {
      const result = await strictEvaluator.evaluate({
        input: {},
        output: { tools: ['search', 'display'] },
        expected: { tools: ['search', 'display'] },
        metadata: null,
      });

      expect(result.score).toBe(1.0);
      expect(result.metadata).toMatchObject({ precision: 1, exactSequence: true });
    });
  });
});
