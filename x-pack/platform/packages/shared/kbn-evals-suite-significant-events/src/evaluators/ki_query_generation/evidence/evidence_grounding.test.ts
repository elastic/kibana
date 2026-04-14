/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evidenceGroundingEvaluator } from './evidence_grounding';

describe('evidence_grounding evaluator', () => {
  it('returns null when no evidence strings present', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: { sample_logs: ['log line'] },
      output: [
        { esql: 'FROM logs | WHERE true', title: 'A', category: 'error', severity_score: 50 },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeNull();
  });

  it('scores based on evidence found in sample logs', async () => {
    const result = await evidenceGroundingEvaluator.evaluate({
      input: { sample_logs: ['payment timeout observed', 'service running'] },
      output: [
        {
          esql: 'FROM logs | WHERE body.text:"timeout"',
          title: 'A',
          category: 'error',
          severity_score: 50,
          evidence: ['timeout', 'nonexistent evidence'],
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('nonexistent evidence');
  });
});
