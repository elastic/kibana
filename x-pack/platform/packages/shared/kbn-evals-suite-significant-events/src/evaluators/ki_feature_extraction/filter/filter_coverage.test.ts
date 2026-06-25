/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterCoverageEvaluator } from './filter_coverage';
import { createSearchHit, createKI } from '../test_helpers';

describe('filter_coverage evaluator', () => {
  it('scores 0 for entities missing a filter', async () => {
    const result = await filterCoverageEvaluator.evaluate({
      input: { sample_documents: [createSearchHit({ 'service.name': 'frontend' })] },
      output: {
        features: [
          createKI({
            id: 'entity-frontend',
            type: 'entity',
            description: 'frontend',
            confidence: 80,
          }),
        ],
      },
      expected: { criteria: [], expected_ground_truth: '', expect_entity_filters: true },
      metadata: null,
    });

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('lack a filter');
  });

  it('scores 1 when all entities have a filter', async () => {
    const result = await filterCoverageEvaluator.evaluate({
      input: { sample_documents: [createSearchHit({ 'service.name': 'frontend' })] },
      output: {
        features: [
          createKI({
            id: 'entity-frontend',
            type: 'entity',
            description: 'frontend',
            confidence: 80,
            filter: { field: 'service.name', eq: 'frontend' },
          }),
        ],
      },
      expected: { criteria: [], expected_ground_truth: '', expect_entity_filters: true },
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('skips evaluation when expect_entity_filters is not set', async () => {
    const result = await filterCoverageEvaluator.evaluate({
      input: { sample_documents: [] },
      output: { features: [] },
      expected: { criteria: [], expected_ground_truth: '' },
      metadata: null,
    });

    expect(result.score).toBeNull();
  });
});
