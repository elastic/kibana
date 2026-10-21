/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectWhere, predicateToEsql, selectionsToEsql } from './esql';

describe('predicateToEsql', () => {
  it('quotes string terms and escapes quotes and backslashes', () => {
    expect(predicateToEsql({ field: 'extension.keyword', value: 'a"b\\c' })).toBe(
      '`extension.keyword` == "a\\"b\\\\c"'
    );
  });

  it('escapes backticks in field names', () => {
    expect(predicateToEsql({ field: 'we`ird', value: 1 })).toBe('`we``ird` == 1');
  });

  it('leaves simple field names bare and numbers and booleans unquoted', () => {
    expect(predicateToEsql({ field: 'status', value: 404 })).toBe('status == 404');
    expect(predicateToEsql({ field: 'ok', value: false })).toBe('ok == false');
  });

  it('writes a date range as half-open TO_DATETIME bounds', () => {
    expect(
      predicateToEsql({
        field: '@timestamp',
        range: { gte: '2026-10-13T13:00:00.000Z', lt: '2026-10-13T14:00:00.000Z' },
      })
    ).toBe(
      '`@timestamp` >= TO_DATETIME("2026-10-13T13:00:00.000Z") AND `@timestamp` < TO_DATETIME("2026-10-13T14:00:00.000Z")'
    );
  });

  it('writes a numeric range as plain bounds', () => {
    expect(predicateToEsql({ field: 'bytes', range: { gte: 0, lt: 1024 } })).toBe(
      'bytes >= 0 AND bytes < 1024'
    );
  });

  it('keeps a hostile date bound inside its string literal', () => {
    expect(predicateToEsql({ field: 't', range: { gte: '") OR true OR ("', lt: 'x' } })).toBe(
      't >= TO_DATETIME("\\") OR true OR (\\"") AND t < TO_DATETIME("x")'
    );
  });

  it('rejects a predicate with neither value nor range, and non-finite numbers', () => {
    expect(() => predicateToEsql({ field: 'x' })).toThrow(/neither value nor range/);
    expect(() => predicateToEsql({ field: 'x', value: Number.NaN })).toThrow(/not finite/);
  });
});

describe('injectWhere', () => {
  const esql = 'FROM logs | WHERE a == 1 | STATS c = COUNT(*) BY b | WHERE c > 10';

  it('ANDs onto the leading WHERE, never one after STATS', () => {
    expect(injectWhere(esql, ['x == 2', 'y == 3'])).toBe(
      'FROM logs | WHERE ((x == 2) AND (y == 3)) AND a == 1 | STATS c = COUNT(*) BY b | WHERE c > 10'
    );
  });

  it('inserts a WHERE after the source command when there is none', () => {
    expect(injectWhere('FROM logs | STATS c = COUNT(*)', ['x == 2'])).toBe(
      'FROM logs | WHERE x == 2 | STATS c = COUNT(*)'
    );
  });

  it('leaves the query alone with no predicates', () => {
    expect(injectWhere(esql, selectionsToEsql([]))).toBe(esql);
  });
});
