/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryTypeDistributionEvaluator } from './query_type_distribution';

describe('query_type_distribution evaluator', () => {
  it('returns null when expect_stats is not set', async () => {
    const result = await queryTypeDistributionEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        {
          esql: 'FROM logs | WHERE body.text:"error"',
          title: 'A',
          category: 'error',
          severity_score: 50,
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeNull();
  });

  it('scores 1 when both MATCH and STATS queries present', async () => {
    const result = await queryTypeDistributionEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        {
          esql: 'FROM logs | WHERE body.text:"error"',
          title: 'Match',
          category: 'error',
          severity_score: 50,
        },
        {
          esql: 'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) WHERE log.level IS NOT NULL BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(total > 0, errors * 100.0 / total, 0) | KEEP bucket, metric_value',
          title: 'Stats',
          category: 'error',
          severity_score: 65,
        },
      ],
      expected: { expect_stats: true },
      metadata: null,
    });

    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ match: 1, stats: 1 });
  });

  it('scores 0.5 when only MATCH queries present but STATS expected', async () => {
    const result = await queryTypeDistributionEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        {
          esql: 'FROM logs | WHERE body.text:"error"',
          title: 'Match',
          category: 'error',
          severity_score: 50,
        },
      ],
      expected: { expect_stats: true },
      metadata: null,
    });

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('No STATS queries');
  });
});
