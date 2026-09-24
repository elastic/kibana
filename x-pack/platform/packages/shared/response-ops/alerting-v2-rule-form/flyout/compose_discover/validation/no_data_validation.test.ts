/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNoDataStrategy } from './no_data_validation';

const baseOnlyQuery = { base: 'FROM logs-* | WHERE error', breach: { segment: '' } };
const splitQuery = { base: 'FROM logs-*', breach: { segment: 'WHERE error' } };

describe('validateNoDataStrategy', () => {
  it.each(['keep_last', 'resolve'] as const)(
    'returns an error for strategy "%s" on a query with no alert condition',
    (strategy) => {
      const result = validateNoDataStrategy({
        kind: 'alert',
        query: baseOnlyQuery,
        noData: { strategy },
      });

      expect(result).toMatch(/alert condition/i);
    }
  );

  it.each(['keep_last', 'resolve'] as const)(
    'returns true for strategy "%s" once the query has an alert condition',
    (strategy) => {
      expect(
        validateNoDataStrategy({ kind: 'alert', query: splitQuery, noData: { strategy } })
      ).toBe(true);
    }
  );

  it('returns true when a presence query is set instead of an alert condition', () => {
    expect(
      validateNoDataStrategy({
        kind: 'alert',
        query: baseOnlyQuery,
        noData: { strategy: 'keep_last', query: 'FROM logs-*' },
      })
    ).toBe(true);
  });

  it('returns true for strategy "ignore" on a query with no alert condition', () => {
    expect(
      validateNoDataStrategy({
        kind: 'alert',
        query: baseOnlyQuery,
        noData: { strategy: 'ignore' },
      })
    ).toBe(true);
  });

  it('returns true when noData is unset, which the mapper sends as "ignore"', () => {
    expect(validateNoDataStrategy({ kind: 'alert', query: baseOnlyQuery })).toBe(true);
  });

  it('returns true for signal rules, which carry no no_data at all', () => {
    expect(
      validateNoDataStrategy({
        kind: 'signal',
        query: baseOnlyQuery,
        noData: { strategy: 'keep_last' },
      })
    ).toBe(true);
  });
});
