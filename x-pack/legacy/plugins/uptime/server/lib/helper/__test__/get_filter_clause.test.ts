/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFilterClause } from '../get_filter_clause';

describe('getFilterClause', () => {
  it('returns a filter object with range when only dates are supplied', () => {
    const result = getFilterClause('now-15m', 'now');
    expect(result).toMatchSnapshot();
  });

  it('returns a filter object with additional fields', () => {
    const additionalFilters: Array<{ [key: string]: any }> = [
      {
        exists: {
          field: 'summary.up',
        },
      },
    ];
    additionalFilters.push({ bool: { must: [{ term: { 'monitor.id': 'foo' } }] } });
    const result = getFilterClause('now-15m', 'now', additionalFilters);
    expect(result).toMatchSnapshot();
  });
});
