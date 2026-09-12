/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasActiveUserActivityFilter, hasSearchOrAuthorFilter } from './utils';
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
    expect(hasActiveUserActivityFilter({ ...baseParams, authors: ['elastic'] })).toBe(true);
  });

  it('returns true when multiple authors are applied', () => {
    expect(hasActiveUserActivityFilter({ ...baseParams, authors: ['elastic', 'other'] })).toBe(
      true
    );
  });

  it('returns true when a search term is applied', () => {
    expect(hasActiveUserActivityFilter({ ...baseParams, search: 'hello' })).toBe(true);
  });

  it('returns false when search is an empty string', () => {
    expect(hasActiveUserActivityFilter({ ...baseParams, search: '' })).toBe(false);
  });

  it('returns false when authors is an empty array', () => {
    expect(hasActiveUserActivityFilter({ ...baseParams, authors: [] })).toBe(false);
  });
});

describe('hasSearchOrAuthorFilter', () => {
  it('returns false when neither search nor authors are set', () => {
    expect(hasSearchOrAuthorFilter({})).toBe(false);
  });

  it('returns true when search is set', () => {
    expect(hasSearchOrAuthorFilter({ search: 'hello' })).toBe(true);
  });

  it('returns false when search is an empty string', () => {
    expect(hasSearchOrAuthorFilter({ search: '' })).toBe(false);
  });

  it('returns true when authors has at least one entry', () => {
    expect(hasSearchOrAuthorFilter({ authors: ['elastic'] })).toBe(true);
  });

  it('returns false when authors is an empty array', () => {
    expect(hasSearchOrAuthorFilter({ authors: [] })).toBe(false);
  });

  it('returns true when both search and authors are set', () => {
    expect(hasSearchOrAuthorFilter({ search: 'hello', authors: ['elastic'] })).toBe(true);
  });
});
