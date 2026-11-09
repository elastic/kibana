/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractReadOnlyEsqlIndexPattern } from './esql_index_source';

describe('extractReadOnlyEsqlIndexPattern', () => {
  it('extracts index patterns for FROM queries with optional SORT, LIMIT, KEEP, and DROP commands', () => {
    expect(extractReadOnlyEsqlIndexPattern('FROM logs-*')).toBe('logs-*');
    expect(extractReadOnlyEsqlIndexPattern('  from logs-payments.api-*  ')).toBe(
      'logs-payments.api-*'
    );
    expect(extractReadOnlyEsqlIndexPattern('FROM logs-a-*, logs-b-*, logs-a-*')).toBe(
      'logs-a-*,logs-b-*'
    );
    expect(
      extractReadOnlyEsqlIndexPattern(
        'FROM logs-* | SORT @timestamp DESC | KEEP message, log.level | DROP host.ip | LIMIT 100'
      )
    ).toBe('logs-*');
  });

  it('rejects WHERE, STATS, EVAL, TS, METADATA, subqueries, and invalid ES|QL', () => {
    expect(extractReadOnlyEsqlIndexPattern('')).toBeUndefined();
    expect(extractReadOnlyEsqlIndexPattern('FROM')).toBeUndefined();
    expect(extractReadOnlyEsqlIndexPattern('TS metrics-*')).toBeUndefined();
    expect(extractReadOnlyEsqlIndexPattern('ROW a = 1')).toBeUndefined();
    expect(extractReadOnlyEsqlIndexPattern('FROM logs-* METADATA _id')).toBeUndefined();
    expect(
      extractReadOnlyEsqlIndexPattern('FROM (FROM logs-* | WHERE log.level == "error")')
    ).toBeUndefined();
    expect(
      extractReadOnlyEsqlIndexPattern('FROM logs-* | WHERE log.level == "error"')
    ).toBeUndefined();
    expect(extractReadOnlyEsqlIndexPattern('FROM logs-* | STATS count()')).toBeUndefined();
    expect(extractReadOnlyEsqlIndexPattern('FROM logs-* | EVAL x = 1')).toBeUndefined();
    expect(extractReadOnlyEsqlIndexPattern('FROM logs-* | WHERE')).toBeUndefined();
  });
});
