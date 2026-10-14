/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasRejectedJoinTarget } from './join_errors';

describe('hasRejectedJoinTarget', () => {
  it('detects a rejected JOIN index', () => {
    expect(
      hasRejectedJoinTarget([
        {
          type: 'validate_query',
          query: 'FROM sales | LOOKUP JOIN products ON id',
          success: false,
          error: '"products" is not a valid JOIN index. Please use a "lookup" mode index.',
        },
      ])
    ).toBe(true);
  });

  it('detects an unknown enrich policy', () => {
    expect(
      hasRejectedJoinTarget([
        {
          type: 'execute_query',
          query: 'FROM sales | ENRICH nope',
          success: false,
          error: 'Unknown policy "nope"',
        },
      ])
    ).toBe(true);
  });

  // Other failures are worth retrying; only an unusable join target is terminal.
  it('ignores unrelated failures', () => {
    expect(
      hasRejectedJoinTarget([
        {
          type: 'validate_query',
          query: 'FROM sales | WHER x',
          success: false,
          error: 'Unknown column [WHER]',
        },
        { type: 'execute_query', query: 'FROM sales', success: false, error: 'search timed out' },
      ])
    ).toBe(false);
  });

  it('ignores successful attempts and non query-outcome actions', () => {
    expect(
      hasRejectedJoinTarget([
        { type: 'validate_query', query: 'FROM sales', success: true },
        { type: 'generate_query', success: true, response: 'x' },
        { type: 'request_documentation', requestedKeywords: ['JOIN'], fetchedDoc: {} },
      ])
    ).toBe(false);
    expect(hasRejectedJoinTarget([])).toBe(false);
  });
});
