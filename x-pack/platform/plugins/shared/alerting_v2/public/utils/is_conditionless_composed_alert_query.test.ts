/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConditionlessComposedAlertQuery } from './is_conditionless_composed_alert_query';

describe('isConditionlessComposedAlertQuery', () => {
  it('returns true for composed queries with an empty breach segment', () => {
    expect(
      isConditionlessComposedAlertQuery({
        format: 'composed',
        base: 'FROM logs-* | STATS count = COUNT(*)',
        breach: { segment: '' },
      })
    ).toBe(true);
  });

  it('returns true for whitespace-only breach segments', () => {
    expect(
      isConditionlessComposedAlertQuery({
        format: 'composed',
        base: 'FROM logs-* | STATS count = COUNT(*)',
        breach: { segment: '   ' },
      })
    ).toBe(true);
  });

  it('returns false when a breach segment is present', () => {
    expect(
      isConditionlessComposedAlertQuery({
        format: 'composed',
        base: 'FROM logs-* | STATS count = COUNT(*)',
        breach: { segment: 'WHERE count > 0' },
      })
    ).toBe(false);
  });

  it('returns false for standalone queries', () => {
    expect(
      isConditionlessComposedAlertQuery({
        format: 'standalone',
        breach: { query: 'FROM logs-* | LIMIT 10' },
      })
    ).toBe(false);
  });

  it('returns false when query is missing', () => {
    expect(isConditionlessComposedAlertQuery(undefined)).toBe(false);
  });
});
