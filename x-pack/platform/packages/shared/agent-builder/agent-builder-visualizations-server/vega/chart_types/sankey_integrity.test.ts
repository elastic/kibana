/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatSankeyIntegrityError,
  hasSankeyColumns,
  validateSankeyRows,
} from './sankey_integrity';

describe('validateSankeyRows', () => {
  const columns = [
    { name: 'stk1', type: 'keyword' as const },
    { name: 'stk2', type: 'keyword' as const },
    { name: 'size', type: 'long' as const },
  ];

  it('detects sankey columns with aliases', () => {
    expect(hasSankeyColumns(columns)).toBe(true);
    expect(
      hasSankeyColumns([
        { name: 'source', type: 'keyword' },
        { name: 'dest', type: 'keyword' },
        { name: 'count', type: 'long' },
      ])
    ).toBe(true);
    expect(hasSankeyColumns([{ name: 'stk1', type: 'keyword' }])).toBe(false);
  });

  it('passes for ≥2 flows with numeric size', () => {
    expect(
      validateSankeyRows({
        columns,
        values: [
          ['US', 'IT', 10],
          ['US', 'JP', 4],
        ],
      })
    ).toEqual({ ok: true });
  });

  it('fails when there are fewer than 2 flows', () => {
    expect(
      validateSankeyRows({
        columns,
        values: [['US', 'IT', 10]],
      })
    ).toEqual({ ok: false, reason: 'too_few_flows', flowCount: 1 });
  });

  it('fails when endpoints are blank', () => {
    expect(
      validateSankeyRows({
        columns,
        values: [
          ['US', 'IT', 10],
          [null, 'JP', 4],
        ],
      })
    ).toEqual({ ok: false, reason: 'blank_endpoints' });
  });

  it('formats sankey regeneration errors', () => {
    expect(formatSankeyIntegrityError({ ok: false, reason: 'missing_columns' })).toContain(
      'stk1/stk2/size'
    );
    expect(
      formatSankeyIntegrityError({ ok: false, reason: 'too_few_flows', flowCount: 1 })
    ).toContain('at least 2');
  });
});
