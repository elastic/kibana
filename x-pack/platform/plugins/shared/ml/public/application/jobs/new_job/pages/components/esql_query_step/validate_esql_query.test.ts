/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateEsqlQuery } from './validate_esql_query';

const unnamed = (expression: string) => ({ type: 'unnamedColumn', expression, severity: 'error' });
const unsupported = (expression: string, severity = 'error') => ({
  type: 'unsupportedStatsColumn',
  expression,
  severity,
});
const changed = (expression: string, severity = 'error') => ({
  type: 'changedAfterStats',
  expression,
  severity,
});

describe('validateEsqlQuery', () => {
  it('accepts a query whose columns are all named', () => {
    expect(
      validateEsqlQuery(
        'FROM farequote | EVAL rt = responsetime * 2 | STATS event_count = COUNT(*), m = AVG(rt) BY bucket_time = BUCKET(@timestamp, 15 minutes), airline'
      )
    ).toEqual([]);
  });

  it('accepts a query that returns raw rows', () => {
    expect(validateEsqlQuery('FROM farequote | KEEP @timestamp, responsetime')).toEqual([]);
  });

  it('rejects unnamed aggregations and groupings in STATS', () => {
    expect(
      validateEsqlQuery(
        'FROM farequote | STATS COUNT(*), m = AVG(responsetime) BY BUCKET(@timestamp, 1 hour), airline'
      )
    ).toEqual([unnamed('COUNT(*)'), unnamed('BUCKET(@timestamp, 1 hour)')]);
  });

  it('rejects filtered aggregations, reporting unnamed ones once', () => {
    expect(
      validateEsqlQuery(
        'FROM logs | STATS c = COUNT(*) WHERE bytes > 0, MAX(bytes) WHERE bytes > 0'
      )
    ).toEqual([unnamed('MAX(bytes) WHERE bytes > 0'), unsupported('c = COUNT(*) WHERE bytes > 0')]);
  });

  it('rejects STATS columns without a matching ML function', () => {
    expect(
      validateEsqlQuery(
        'FROM logs | STATS a = COUNT(bytes), b = COUNT_DISTINCT(host), c = PERCENTILE(bytes, 95), d = STD_DEV(bytes), e = VALUES(host) BY t = BUCKET(@timestamp, 1 hour)'
      )
    ).toEqual([
      unsupported('a = COUNT(bytes)'),
      unsupported('b = COUNT_DISTINCT(host)'),
      unsupported('c = PERCENTILE(bytes, 95)'),
      unsupported('d = STD_DEV(bytes)'),
      unsupported('e = VALUES(host)'),
    ]);
  });

  it('rejects expressions built from aggregations', () => {
    expect(
      validateEsqlQuery(
        'FROM logs | STATS kb = AVG(bytes) / 1024, c = -COUNT(*), r = ROUND(AVG(bytes)) BY host'
      )
    ).toEqual([
      unsupported('kb = AVG(bytes) / 1024'),
      unsupported('c = -COUNT(*)'),
      unsupported('r = ROUND(AVG(bytes))'),
    ]);
  });

  it('only checks the aggregations of the last STATS', () => {
    expect(
      validateEsqlQuery(
        'FROM logs | STATS n = COUNT_DISTINCT(ip) BY host, t = BUCKET(@timestamp, 1 hour) | STATS m = MAX(n) BY t'
      )
    ).toEqual([]);
  });

  it('rejects EVAL and RENAME after the last STATS', () => {
    expect(
      validateEsqlQuery(
        'FROM logs | EVAL kb = bytes / 1024 | STATS m = AVG(kb) BY host | EVAL m2 = m * 2 | RENAME m AS avg_kb | SORT host'
      )
    ).toEqual([changed('EVAL m2 = m * 2'), changed('RENAME m AS avg_kb')]);
  });

  it('rejects unnamed expressions in EVAL and INLINE STATS', () => {
    expect(
      validateEsqlQuery(
        'FROM logs | EVAL bytes / 1024, kb = bytes / 1024 | INLINE STATS MAX(kb) BY host'
      )
    ).toEqual([unnamed('bytes / 1024'), unnamed('MAX(kb)')]);
  });

  it('only warns about columns the advanced wizard can use', () => {
    expect(
      validateEsqlQuery(
        'FROM logs | STATS COUNT(*), s = VALUES(host) BY t = BUCKET(@timestamp, 1 hour) | EVAL s2 = s',
        { isAdvanced: true }
      )
    ).toEqual([
      unnamed('COUNT(*)'),
      unsupported('s = VALUES(host)', 'warning'),
      changed('EVAL s2 = s', 'warning'),
    ]);
  });

  it('leaves queries with syntax errors to the editor', () => {
    expect(validateEsqlQuery('FROM logs | STATS COUNT(*) BY')).toEqual([]);
    expect(validateEsqlQuery('')).toEqual([]);
  });
});
