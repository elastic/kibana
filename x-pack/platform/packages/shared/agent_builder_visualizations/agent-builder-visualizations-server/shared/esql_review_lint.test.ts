/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lintVisualizationEsql } from './esql_review_lint';

describe('lintVisualizationEsql', () => {
  it('accepts auto-bucketed time series with both time-picker params', () => {
    expect(
      lintVisualizationEsql(
        'FROM logs | STATS count = COUNT() BY bucket = BUCKET(event.ingested, 75, ?_tstart, ?_tend)'
      )
    ).toEqual([]);
    expect(
      lintVisualizationEsql(
        'TS metrics | STATS count = COUNT() BY bucket = TBUCKET(75, ?_tstart, ?_tend)'
      )
    ).toEqual([]);
  });

  it('flags DATE_TRUNC regardless of the time field name', () => {
    expect(
      lintVisualizationEsql(
        'FROM logs | STATS count = COUNT() BY bucket = DATE_TRUNC(1 hour, event.ingested)'
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'date_trunc',
          severity: 'miss',
        }),
      ])
    );
  });

  it('flags a hardcoded BUCKET interval', () => {
    expect(
      lintVisualizationEsql(
        'FROM logs | STATS count = COUNT() BY bucket = BUCKET(event.ingested, 1 hour)'
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'hardcoded_interval',
          severity: 'miss',
        }),
      ])
    );
  });

  it('flags time-bucketed queries missing ?_tstart or ?_tend without requiring @timestamp', () => {
    expect(
      lintVisualizationEsql(
        'FROM logs | STATS count = COUNT() BY bucket = BUCKET(event.ingested, 75, now()-1d, now())'
      )
    ).toEqual([
      expect.objectContaining({
        kind: 'missing_time_params',
        severity: 'miss',
      }),
    ]);
    expect(
      lintVisualizationEsql('TS metrics | STATS count = COUNT() BY bucket = TBUCKET(75)')
    ).toEqual([
      expect.objectContaining({
        kind: 'missing_time_params',
        severity: 'miss',
      }),
    ]);
  });

  it('does not flag numeric histograms or queries that are not time-bucketed', () => {
    expect(
      lintVisualizationEsql('FROM logs | STATS count = COUNT() BY bytes = BUCKET(bytes, 10)')
    ).toEqual([]);
    expect(
      lintVisualizationEsql('FROM logs | WHERE status == 200 | STATS count = COUNT() BY host.name')
    ).toEqual([]);
  });
});
