/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineRangeWithFilters } from '../elasticsearch_monitors_adapter';

describe('combineRangeWithFilters', () => {
  it('combines filters that have no filter clause', () => {
    expect(
      combineRangeWithFilters('now-15m', 'now', {
        bool: { should: [{ match: { 'url.port': 80 } }], minimum_should_match: 1 },
      })
    ).toMatchSnapshot();
  });

  it('combines query with filter object', () => {
    expect(
      combineRangeWithFilters('now-15m', 'now', {
        bool: {
          filter: { term: { field: 'monitor.id' } },
          should: [{ match: { 'url.port': 80 } }],
          minimum_should_match: 1,
        },
      })
    ).toMatchSnapshot();
  });

  it('combines query with filter list', () => {
    expect(
      combineRangeWithFilters('now-15m', 'now', {
        bool: {
          filter: [{ field: 'monitor.id' }],
          should: [{ match: { 'url.port': 80 } }],
          minimum_should_match: 1,
        },
      })
    ).toMatchSnapshot();
  });
});
