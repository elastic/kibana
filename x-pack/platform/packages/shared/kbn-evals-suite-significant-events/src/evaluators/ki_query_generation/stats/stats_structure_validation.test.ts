/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { statsStructureValidationEvaluator } from './stats_structure_validation';

describe('stats_structure_validation evaluator', () => {
  it('returns null when no STATS queries present', async () => {
    const result = await statsStructureValidationEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        {
          esql: 'FROM logs | WHERE body.text:"error"',
          title: 'Match',
          category: 'error',
          severity_score: 50,
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeNull();
  });

  it('scores well-formed STATS queries highly', async () => {
    const result = await statsStructureValidationEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        {
          esql: 'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) WHERE log.level IS NOT NULL BY bucket = BUCKET(@timestamp, 5 minutes) | EVAL error_rate = errors * 100.0 / total | WHERE total > 20 AND error_rate > 10',
          title: 'Error rate spike',
          category: 'error',
          severity_score: 65,
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeGreaterThanOrEqual(0.8);
  });

  it('penalises STATS queries missing threshold filter', async () => {
    const result = await statsStructureValidationEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        {
          esql: 'FROM logs | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes)',
          title: 'No threshold',
          category: 'error',
          severity_score: 65,
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeLessThan(1);
    expect(result.explanation).toContain('STATS structure issues');
  });
});
