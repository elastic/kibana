/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { invokeHandler, createMockToolContext } from '../../../utils/test_helpers';
import { createWriteQueriesTool } from './tool';

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
  const createTool = (validatedQueries: (typeof validQuery)[] | undefined) =>
    createWriteQueriesTool({
      getValidatedQueries: () => validatedQueries,
    });

  it('bounds its input', () => {
    const tool = createTool([validQuery]);
    expect(tool.schema.safeParse({ queries: [validQuery] }).success).toBe(true);
    expect(tool.schema.safeParse({ queries: [] }).success).toBe(true);
    expect(tool.schema.safeParse({ queries: Array(101).fill(validQuery) }).success).toBe(false);
    expect(
      tool.schema.safeParse({
        queries: [{ ...validQuery, features: [{ id: 'feature-1' }] }],
      }).success
    ).toBe(true);
  });

  it('acknowledges the written batch', async () => {
    const queries = [validQuery, { ...validQuery, title: 'Errors' }];
    const result = await invokeHandler(createTool(queries), { queries }, createMockToolContext());
    if (!('results' in result)) throw new Error('Expected standard tool result');

    expect(result.results).toEqual([{ type: 'other', data: { written: true, count: 2, queries } }]);
  });

  it('rejects a batch that differs from the last validated queries', async () => {
    const result = await invokeHandler(
      createTool([validQuery]),
      { queries: [{ ...validQuery, esql: { query: 'FROM other-stream' } }] },
      createMockToolContext()
    );
    if (!('results' in result)) throw new Error('Expected standard tool result');

    expect(result.results).toEqual([
      {
        type: 'error',
        data: {
          message:
            'queries must exactly match accepted_queries from the last successful validate_queries call',
        },
      },
    ]);
  });

  it('allows an empty batch without a validation call', async () => {
    const result = await invokeHandler(
      createTool(undefined),
      { queries: [] },
      createMockToolContext()
    );
    if (!('results' in result)) throw new Error('Expected standard tool result');

    expect(result.results).toEqual([
      { type: 'other', data: { written: true, count: 0, queries: [] } },
    ]);
  });
});
