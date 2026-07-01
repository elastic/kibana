/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasActiveUserActivityFilter } from './utils';
import type { UserActivityParams } from './types';

describe('hasActiveUserActivityFilter', () => {
  const baseParams: UserActivityParams = {
    type: 'all',
    sortOrder: 'asc',
    page: 1,
    perPage: 10,
  };

  it('returns false when no filter is applied', () => {
    expect(hasActiveUserActivityFilter(baseParams)).toBe(false);
  });

  it('returns true when the type filter is not "all"', () => {
    expect(hasActiveUserActivityFilter({ ...baseParams, type: 'user' })).toBe(true);
    expect(hasActiveUserActivityFilter({ ...baseParams, type: 'action' })).toBe(true);
  });

  it('returns true when an author filter is applied', () => {
    expect(hasActiveUserActivityFilter({ ...baseParams, author: 'elastic' })).toBe(true);
  });

  it('returns true when a search term is applied', () => {
    expect(hasActiveUserActivityFilter({ ...baseParams, search: 'hello' })).toBe(true);
  });

  it('returns false when search is an empty string', () => {
    expect(hasActiveUserActivityFilter({ ...baseParams, search: '' })).toBe(false);
  });

  it('returns false when author is an empty string', () => {
    expect(hasActiveUserActivityFilter({ ...baseParams, author: '' })).toBe(false);
  });
});
