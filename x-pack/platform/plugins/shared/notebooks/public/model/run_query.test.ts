/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isResultTruncated } from './run_query';

describe('isResultTruncated', () => {
  it('flags the implicit default limit when the query has no LIMIT', () => {
    expect(isResultTruncated('FROM logs', 1000)).toBe(true);
    expect(isResultTruncated('FROM logs', 999)).toBe(false);
  });

  it('does not flag a LIMIT the user wrote', () => {
    expect(isResultTruncated('FROM logs | LIMIT 10', 10)).toBe(false);
    expect(isResultTruncated('FROM logs | limit 5000', 5000)).toBe(false);
  });

  it('flags the hard maximum when the LIMIT asks for more', () => {
    expect(isResultTruncated('FROM logs | LIMIT 50000', 10_000)).toBe(true);
    expect(isResultTruncated('FROM logs | LIMIT 10000', 10_000)).toBe(false);
  });

  it('uses the last LIMIT in the query', () => {
    expect(isResultTruncated('FROM logs | LIMIT 5000 | SORT bytes | LIMIT 10', 10)).toBe(false);
  });
});
