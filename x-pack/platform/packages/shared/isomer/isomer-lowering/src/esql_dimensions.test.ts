/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dimensionsFromEsql, numericBucketWidth } from './esql_dimensions';

describe('dimensionsFromEsql', () => {
  it('follows EVAL aliases into STATS groupings, with date buckets', () => {
    expect(
      dimensionsFromEsql(
        'FROM logs | WHERE `@timestamp` >= NOW() - 24 hour | EVAL `col-extension` = `extension.keyword` | STATS `col-count` = COUNT(*) BY `col-time` = BUCKET(`@timestamp`, 1h), `col-extension` | SORT `col-time`'
      )
    ).toEqual({
      'col-time': { kind: 'date_histogram', field: '@timestamp', intervalMs: 3_600_000 },
      'col-extension': { kind: 'terms', field: 'extension.keyword' },
    });
  });

  it('leaves a CASE-derived grouping unselectable', () => {
    expect(
      dimensionsFromEsql(
        'FROM logs | EVAL `split` = CASE(TO_DOUBLE(`response.keyword`) >= 500, "5xx", "other") | STATS n = COUNT(*) BY t = BUCKET(timestamp, 1h), `split`'
      )
    ).toEqual({ t: { kind: 'date_histogram', field: 'timestamp', intervalMs: 3_600_000 } });
  });

  it('reads the four-argument numeric BUCKET from Kibana’s sample "Bytes distribution" panel', () => {
    expect(
      dimensionsFromEsql(
        'FROM kibana_sample_data_logs | WHERE `@timestamp` >= NOW() - 7 day | INLINESTATS total_visits = COUNT() | STATS visits = COUNT() by bytes = bucket(bytes, 1000, 0, 100000), total_visits | EVAL percentage = (TO_DOUBLE(visits) / total_visits) | EVAL percentage = ROUND(percentage, 3) | DROP total_visits, visits'
      )
    ).toEqual({ bytes: { kind: 'histogram', field: 'bytes', width: 100, derived: true } });
  });

  it('follows RENAME and drops what DROP removes', () => {
    expect(
      dimensionsFromEsql(
        'FROM logs | STATS c = COUNT(*) BY `host.keyword`, region | RENAME `host.keyword` AS Host | DROP region'
      )
    ).toEqual({ Host: { kind: 'terms', field: 'host.keyword' } });
  });

  it('reads a two-argument numeric span', () => {
    expect(dimensionsFromEsql('FROM logs | STATS c = COUNT(*) BY b = BUCKET(bytes, 500)')).toEqual({
      b: { kind: 'histogram', field: 'bytes', width: 500 },
    });
  });

  it('maps nothing for a query with no groupings', () => {
    expect(
      dimensionsFromEsql('FROM logs | STATS COUNT(*) | RENAME `COUNT(*)` as `Visits`')
    ).toEqual({});
  });
});

describe('numericBucketWidth', () => {
  it.each([
    [1000, 0, 100000, 100],
    [30, 0, 20000, 1000],
    [7, 0, 20000, 5000],
    [10, 0, 15000, 5000],
    [10, 0, 11000, 5000],
    [100, 0, 15000, 500],
    [3, 0, 20000, 10000],
    [4, 0, 30000, 10000],
  ])('BUCKET(field, %i, %i, %i) is %i wide, as ES 9.6 returned', (buckets, from, to, width) => {
    expect(numericBucketWidth(buckets, from, to)).toBe(width);
  });
});
