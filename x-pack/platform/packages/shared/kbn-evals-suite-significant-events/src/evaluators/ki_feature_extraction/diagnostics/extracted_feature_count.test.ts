/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractedFeatureCountEvaluator } from './extracted_feature_count';
import { createKI, createKIs } from '../test_helpers';

const expected = { criteria: [], expected_ground_truth: '' };

describe('extracted_feature_count evaluator', () => {
  it('reports the raw feature count regardless of dataset bounds', async () => {
    const result = await extractedFeatureCountEvaluator.evaluate({
      input: { sample_documents: [] },
      output: { features: createKIs(9) },
      expected: { ...expected, min_features: 3, max_features: 40 },
      metadata: null,
    });

    expect(result.score).toBe(9);
  });

  it('summarizes evidence volume alongside the count', async () => {
    const result = await extractedFeatureCountEvaluator.evaluate({
      input: { sample_documents: [] },
      output: {
        features: [
          createKI({
            id: 'with-evidence',
            type: 'entity',
            description: 'cart service',
            confidence: 80,
            evidence: ['service.name=cart', 'service.version=1.2.0'],
          }),
          createKI({
            id: 'without-evidence',
            type: 'entity',
            description: 'inferred component',
            confidence: 60,
          }),
        ],
      },
      expected,
      metadata: null,
    });

    expect(result.score).toBe(2);
    expect(result.details).toEqual({
      featureCount: 2,
      totalEvidence: 2,
      maxEvidencePerFeature: 2,
      featuresWithoutEvidence: 1,
    });
  });

  it('reports zero for an empty extraction', async () => {
    const result = await extractedFeatureCountEvaluator.evaluate({
      input: { sample_documents: [] },
      output: { features: [] },
      expected,
      metadata: null,
    });

    expect(result.score).toBe(0);
    expect(result.details).toMatchObject({ featureCount: 0, maxEvidencePerFeature: 0 });
  });
});
