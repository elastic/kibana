/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kiFeatureCountEvaluator } from './ki_feature_count';
import { createKIs } from '../test_helpers';

describe('ki_feature_count evaluator', () => {
  it('returns full credit when the KI count is within bounds', async () => {
    const result = await kiFeatureCountEvaluator.evaluate({
      input: {
        sample_documents: [],
      },
      output: {
        features: createKIs(5),
      },
      expected: {
        criteria: [],
        expected_ground_truth: '',
        min_features: 3,
        max_features: 6,
      },
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('penalizes counts proportionally when below the minimum', async () => {
    const result = await kiFeatureCountEvaluator.evaluate({
      input: {
        sample_documents: [],
      },
      output: {
        features: createKIs(2),
      },
      expected: {
        criteria: [],
        expected_ground_truth: '',
        min_features: 4,
      },
      metadata: null,
    });

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('score=0.50');
  });

  it('penalizes counts proportionally when above the maximum', async () => {
    const result = await kiFeatureCountEvaluator.evaluate({
      input: {
        sample_documents: [],
      },
      output: {
        features: createKIs(12),
      },
      expected: {
        criteria: [],
        expected_ground_truth: '',
        max_features: 10,
      },
      metadata: null,
    });

    expect(result.score).toBe(0.8);
    expect(result.explanation).toContain('score=0.80');
  });
});
