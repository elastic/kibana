/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INTERNAL_ESQL_VIEW_EXCLUSION_LOCAL,
  INTERNAL_ESQL_VIEW_EXCLUSION_REMOTE,
  isPositiveInternalEsqlViewIndexPattern,
  withInternalEsqlViewExclusions,
} from './internal_esql_view_patterns';

describe('isPositiveInternalEsqlViewIndexPattern', () => {
  it('matches unqualified and cluster-prefixed view includes', () => {
    expect(isPositiveInternalEsqlViewIndexPattern('$.alert-actions')).toBe(true);
    expect(isPositiveInternalEsqlViewIndexPattern('kayak-f86d55:$.alert-actions')).toBe(true);
    expect(isPositiveInternalEsqlViewIndexPattern('*:$.*')).toBe(true);
  });

  it('does not match log patterns or view negations', () => {
    expect(isPositiveInternalEsqlViewIndexPattern('logs-*')).toBe(false);
    expect(isPositiveInternalEsqlViewIndexPattern('remote:logs-*')).toBe(false);
    expect(isPositiveInternalEsqlViewIndexPattern(INTERNAL_ESQL_VIEW_EXCLUSION_LOCAL)).toBe(false);
    expect(isPositiveInternalEsqlViewIndexPattern(INTERNAL_ESQL_VIEW_EXCLUSION_REMOTE)).toBe(false);
  });
});

describe('withInternalEsqlViewExclusions', () => {
  it('drops view includes and appends origin plus any-remote exclusions', () => {
    expect(
      withInternalEsqlViewExclusions([
        'logs-*',
        '$.alert-actions',
        'opentable-b5cb9a:$.rule-events',
        'other:filebeat-*',
      ])
    ).toEqual([
      'logs-*',
      'other:filebeat-*',
      INTERNAL_ESQL_VIEW_EXCLUSION_LOCAL,
      INTERNAL_ESQL_VIEW_EXCLUSION_REMOTE,
    ]);
  });

  it('uses the cluster wildcard so exclusions are not tied to a project alias', () => {
    const result = withInternalEsqlViewExclusions(['logs-*']);
    expect(result).toEqual([
      'logs-*',
      INTERNAL_ESQL_VIEW_EXCLUSION_LOCAL,
      INTERNAL_ESQL_VIEW_EXCLUSION_REMOTE,
    ]);
    expect(INTERNAL_ESQL_VIEW_EXCLUSION_REMOTE).toBe('*:-$.*');
  });
});
