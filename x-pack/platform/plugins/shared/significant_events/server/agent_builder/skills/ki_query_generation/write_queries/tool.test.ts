/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { invokeHandler, createMockToolContext } from '../../../utils/test_helpers';
import { writeQueriesTool } from './tool';

const validQuery = {
  type: 'match' as const,
  esql: { query: 'FROM logs.test | WHERE message:"failure"' },
  title: 'Failures',
  description: 'Detects failures',
  category: 'error' as const,
  severity_score: 60,
  features: [{ id: 'feature-1', run_id: 'run-1' }],
};

describe('ki_queries_write tool', () => {
  it('bounds its input', () => {
    expect(writeQueriesTool.schema.safeParse({ queries: [validQuery] }).success).toBe(true);
    // An empty batch is valid: it reports that no queries are justified.
    expect(writeQueriesTool.schema.safeParse({ queries: [] }).success).toBe(true);
    expect(
      writeQueriesTool.schema.safeParse({ queries: Array(101).fill(validQuery) }).success
    ).toBe(false);
    // run_id is optional — validate_queries omits it for features without one.
    expect(
      writeQueriesTool.schema.safeParse({
        queries: [{ ...validQuery, features: [{ id: 'feature-1' }] }],
      }).success
    ).toBe(true);
  });

  it('acknowledges the written batch', async () => {
    const result = await invokeHandler(
      writeQueriesTool,
      { queries: [validQuery, { ...validQuery, title: 'Errors' }] },
      createMockToolContext()
    );
    if (!('results' in result)) throw new Error('Expected standard tool result');

    expect(result.results).toEqual([{ type: 'other', data: { written: true, count: 2 } }]);
  });
});
