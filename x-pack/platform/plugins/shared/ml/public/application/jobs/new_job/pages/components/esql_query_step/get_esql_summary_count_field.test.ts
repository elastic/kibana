/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlSummaryCountField } from './get_esql_summary_count_field';

describe('getEsqlSummaryCountField', () => {
  it('returns the COUNT(*) column of an aggregated query', () => {
    expect(
      getEsqlSummaryCountField(
        'FROM farequote | STATS event_count = COUNT(*) BY bucket_time = BUCKET(@timestamp, 15 minutes)'
      )
    ).toBe('event_count');
  });

  it('finds the column among other aggregations and accepts COUNT()', () => {
    expect(
      getEsqlSummaryCountField(
        'FROM farequote | STATS m = AVG(responsetime), docs = count() BY t = BUCKET(@timestamp, 1 hour), airline'
      )
    ).toBe('docs');
  });

  it('uses the last STATS command', () => {
    expect(
      getEsqlSummaryCountField(
        'FROM logs | STATS a = COUNT(*) BY host, t = BUCKET(@timestamp, 1 minute) | STATS b = COUNT(*) BY t'
      )
    ).toBe('b');
  });

  it('ignores COUNT of a field, which skips missing values', () => {
    expect(
      getEsqlSummaryCountField(
        'FROM logs | STATS c = COUNT(bytes) BY t = BUCKET(@timestamp, 1 hour)'
      )
    ).toBeNull();
  });

  it('returns null for raw-row and invalid queries', () => {
    expect(getEsqlSummaryCountField('FROM farequote | KEEP @timestamp, responsetime')).toBeNull();
    expect(getEsqlSummaryCountField('FROM farequote | STATS')).toBeNull();
    expect(getEsqlSummaryCountField('')).toBeNull();
  });
});
