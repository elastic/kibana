/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getQueryFilterState, isValidKql } from './episodes_query_filter';

describe('episodes query filter', () => {
  it('excludes an invalid URL-restored query string from data queries', () => {
    expect(getQueryFilterState({ status: ['active'], queryString: 'severity:' })).toEqual({
      status: ['active'],
    });
  });

  it('preserves a valid query string for data queries', () => {
    expect(getQueryFilterState({ status: ['active'], queryString: 'severity: high' })).toEqual({
      status: ['active'],
      queryString: 'severity: high',
    });
  });

  it('preserves valid KQL that only applies to classic alerts', () => {
    expect(
      getQueryFilterState({
        status: ['active'],
        queryString: 'kibana.alert.rule.name: test',
      })
    ).toEqual({
      status: ['active'],
      queryString: 'kibana.alert.rule.name: test',
    });
  });

  it('accepts valid KQL without a v2 episode field', () => {
    expect(isValidKql('searching')).toBe(true);
  });

  it('treats an empty query as valid', () => {
    expect(isValidKql('')).toBe(true);
  });
});
