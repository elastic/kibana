/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { severityComplianceEvaluator } from './severity_compliance';

describe('severity_compliance evaluator', () => {
  it('scores full credit for severity in [0, 100]', async () => {
    const result = await severityComplianceEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        { esql: 'FROM logs | WHERE true', title: 'A', category: 'error', severity_score: 0 },
        { esql: 'FROM logs | WHERE true', title: 'B', category: 'error', severity_score: 100 },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('penalises severity outside [0, 100]', async () => {
    const result = await severityComplianceEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        { esql: 'FROM logs | WHERE true', title: 'A', category: 'error', severity_score: 101 },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0);
  });
});
