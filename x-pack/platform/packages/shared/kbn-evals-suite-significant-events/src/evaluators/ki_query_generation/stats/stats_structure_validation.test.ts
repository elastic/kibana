/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { statsStructureValidationEvaluator } from './stats_structure_validation';

const WELL_FORMED_STATS_ESQL =
  'FROM logs | STATS errors = COUNT(*) WHERE log.level == "ERROR", total = COUNT(*) WHERE log.level IS NOT NULL BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(total > 0, errors * 100.0 / total, 0) | KEEP bucket, metric_value';

/** Canonical auth-rate shape from the significant-events system prompt (IN denominator). */
const WELL_FORMED_AUTH_RATE_ESQL =
  'FROM logs | STATS failures = COUNT(*) WHERE event.outcome == "failure", attempts = COUNT(*) WHERE event.outcome IN ("success", "failure") BY bucket = BUCKET(@timestamp, 1 minute) | EVAL metric_value = CASE(attempts > 0, failures * 100.0 / attempts, 0) | KEEP bucket, metric_value';

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

  it('scores well-formed STATS metric-series queries highly', async () => {
    const result = await statsStructureValidationEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        {
          esql: WELL_FORMED_STATS_ESQL,
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

  it('scores the prompt auth-rate IN denominator shape highly', async () => {
    const result = await statsStructureValidationEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        {
          esql: WELL_FORMED_AUTH_RATE_ESQL,
          title: 'Authentication failure rate spike',
          category: 'security',
          severity_score: 70,
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('penalises STATS queries missing metric_value / using post-STATS thresholds', async () => {
    const result = await statsStructureValidationEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        {
          esql: 'FROM logs | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes) | WHERE errors > 10',
          title: 'Legacy threshold series',
          category: 'error',
          severity_score: 65,
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeLessThan(1);
    expect(result.explanation).toContain('STATS structure issues');
    expect(result.explanation).toContain('metric_value');
    expect(result.explanation).toContain('Avoid WHERE after STATS');
  });
});
