/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { BaseFeature } from '@kbn/streams-schema';
import { createKIExtractionEvaluators } from './ki_extraction_evaluators';

const evidenceGroundingEvaluator = createKIExtractionEvaluators().find(
  (evaluator) => evaluator.name === 'evidence_grounding'
);
const kiCountEvaluator = createKIExtractionEvaluators().find(
  (evaluator) => evaluator.name === 'ki_count'
);

const createSearchHit = (source: Record<string, unknown>): SearchHit<Record<string, unknown>> => ({
  _index: 'test-index',
  _id: 'doc-1',
  _source: source,
});

const createKI = (feature: Omit<BaseFeature, 'stream_name' | 'properties'>): BaseFeature => ({
  ...feature,
  stream_name: 'test-stream',
  properties: {},
});

const createKIs = (count: number): BaseFeature[] =>
  Array.from({ length: count }, (_, index) =>
    createKI({
      id: `entity-${index}`,
      type: 'entity',
      description: `entity ${index}`,
      confidence: 80,
    })
  );

describe('evidence grounding evaluator', () => {
  it('does not treat short evidence as grounded by substring matches inside larger words', async () => {
    const result = await evidenceGroundingEvaluator!.evaluate({
      input: {
        sample_documents: [
          createSearchHit({
            message: 'Request TARGET completed',
          }),
        ],
      },
      output: {
        features: [
          createKI({
            id: 'entity-frontend',
            type: 'entity',
            description: 'frontend service',
            confidence: 80,
            evidence: ['GET'],
          }),
        ],
      },
      expected: {
        criteria: [],
        expected_ground_truth: '',
      },
      metadata: null,
    });

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('"GET"');
  });

  it('still grounds short evidence when it appears as its own token', async () => {
    const result = await evidenceGroundingEvaluator!.evaluate({
      input: {
        sample_documents: [
          createSearchHit({
            message: 'GET /api/cart returned 200',
          }),
        ],
      },
      output: {
        features: [
          createKI({
            id: 'entity-cart',
            type: 'entity',
            description: 'cart service',
            confidence: 80,
            evidence: ['GET'],
          }),
        ],
      },
      expected: {
        criteria: [],
        expected_ground_truth: '',
      },
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('supports array index paths in key value evidence', async () => {
    const result = await evidenceGroundingEvaluator!.evaluate({
      input: {
        sample_documents: [
          createSearchHit({
            labels: [{ key: 'deployment.environment', value: 'production' }],
          }),
        ],
      },
      output: {
        features: [
          createKI({
            id: 'infra-kubernetes',
            type: 'infrastructure',
            description: 'runtime environment',
            confidence: 90,
            evidence: ['labels.0.key=deployment.environment'],
          }),
        ],
      },
      expected: {
        criteria: [],
        expected_ground_truth: '',
      },
      metadata: null,
    });

    expect(result.score).toBe(1);
  });
});

describe('ki count evaluator', () => {
  it('returns full credit when the KI count is within bounds', async () => {
    const result = await kiCountEvaluator!.evaluate({
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
    const result = await kiCountEvaluator!.evaluate({
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
    const result = await kiCountEvaluator!.evaluate({
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
