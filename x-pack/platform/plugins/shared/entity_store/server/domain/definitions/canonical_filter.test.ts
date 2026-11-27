/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canonicalizeEsqlFilter } from './canonical_filter';

describe('canonicalizeEsqlFilter', () => {
  it('gives two spellings of one expression the same text', () => {
    expect(canonicalizeEsqlFilter('state=="idle"')).toEqual({
      ok: true,
      filter: 'state == "idle"',
    });
    expect(canonicalizeEsqlFilter('state   ==   "idle"')).toEqual({
      ok: true,
      filter: 'state == "idle"',
    });
  });

  it('names the label when the filter does not parse', () => {
    const result = canonicalizeEsqlFilter('state ==', 'filter of metric "cpu"');
    expect(result.ok).toBe(false);
    expect(result).toEqual({
      ok: false,
      message: expect.stringContaining('filter of metric "cpu" must be a single ES|QL expression'),
    });
  });

  it('rejects a non-boolean literal', () => {
    expect(canonicalizeEsqlFilter('1')).toEqual({
      ok: false,
      message: expect.stringContaining('must be a boolean expression, not a integer literal'),
    });
  });
});
