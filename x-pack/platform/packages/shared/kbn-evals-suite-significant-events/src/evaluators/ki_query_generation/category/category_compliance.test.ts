/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventType } from '@kbn/streams-ai/src/significant_events/types';
import { categoryComplianceEvaluator } from './category_compliance';

describe('category_compliance evaluator', () => {
  it('scores full credit for valid categories', async () => {
    const result = await categoryComplianceEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        { esql: 'FROM logs | WHERE true', title: 'A', category: 'error', severity_score: 50 },
        { esql: 'FROM logs | WHERE true', title: 'B', category: 'operational', severity_score: 50 },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('penalises invalid categories', async () => {
    const result = await categoryComplianceEvaluator.evaluate({
      input: { sample_logs: [] },
      output: [
        {
          esql: 'FROM logs | WHERE true',
          title: 'A',
          category: 'bad' as unknown as SignificantEventType,
          severity_score: 50,
        },
      ],
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0);
  });
});
