/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExistingEsqlQuery, nlQueryNeedsNewEsql } from './reuse_existing_esql';
import type { VisualizationConfig } from './types';

describe('nlQueryNeedsNewEsql', () => {
  it('treats presentation-only edits as schema-only', () => {
    expect(
      nlQueryNeedsNewEsql(
        "Remove the dashboard chrome title so only the metric label 'Request count' is shown. Remove any static background color."
      )
    ).toBe(false);
    expect(
      nlQueryNeedsNewEsql(
        'Hide the metric title and add a background sparkline showing requests over the last 24 hours'
      )
    ).toBe(false);
    expect(
      nlQueryNeedsNewEsql(
        'Use gradient area fill instead of line, hide the legend since there is only one series, and hide axis titles'
      )
    ).toBe(false);
  });

  it('treats new measures, filters, and chart-family changes as query edits', () => {
    expect(
      nlQueryNeedsNewEsql(
        'Hide the metric title, remove the static red color, and add a secondary metric showing error rate'
      )
    ).toBe(true);
    expect(nlQueryNeedsNewEsql('Exclude 503 response codes')).toBe(true);
    expect(nlQueryNeedsNewEsql('Show this as a pie')).toBe(true);
    expect(nlQueryNeedsNewEsql('Add a secondary metric showing average bytes per request')).toBe(
      true
    );
  });
});

describe('getExistingEsqlQuery', () => {
  it('reads a top-level metric data_source', () => {
    expect(
      getExistingEsqlQuery({
        type: 'metric',
        data_source: { type: 'esql', query: 'FROM logs-* | STATS count = COUNT(*)' },
      } as VisualizationConfig)
    ).toBe('FROM logs-* | STATS count = COUNT(*)');
  });

  it('reads the first XY layer data_source', () => {
    expect(
      getExistingEsqlQuery({
        type: 'xy',
        layers: [{ data_source: { type: 'esql', query: 'FROM logs-* | STATS c = COUNT(*) BY @timestamp' } }],
      } as VisualizationConfig)
    ).toBe('FROM logs-* | STATS c = COUNT(*) BY @timestamp');
  });

  it('returns undefined when no query is present', () => {
    expect(getExistingEsqlQuery({ type: 'metric' } as VisualizationConfig)).toBeUndefined();
    expect(getExistingEsqlQuery(undefined)).toBeUndefined();
  });
});
