/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchesIncludeExclude, matchesSearch } from './list_matchers';

describe('matchesIncludeExclude', () => {
  it('passes every value when nothing is selected', () => {
    expect(matchesIncludeExclude({}, 'profile', 'a')).toBe(true);
  });

  it('passes only included values when some are included', () => {
    const filters = { profile: { include: ['a'], exclude: [] } };

    expect(matchesIncludeExclude(filters, 'profile', 'a')).toBe(true);
    expect(matchesIncludeExclude(filters, 'profile', 'b')).toBe(false);
  });

  it('passes every value but the excluded ones', () => {
    const filters = { profile: { include: [], exclude: ['a'] } };

    expect(matchesIncludeExclude(filters, 'profile', 'a')).toBe(false);
    expect(matchesIncludeExclude(filters, 'profile', 'b')).toBe(true);
  });
});

describe('matchesSearch', () => {
  it('matches any value containing the text, ignoring case', () => {
    expect(matchesSearch('Fast', ['catalog', 'catalog-fast'])).toBe(true);
    expect(matchesSearch('slow', ['catalog', 'catalog-fast'])).toBe(false);
  });

  it('ignores the escaping the search bar adds', () => {
    expect(matchesSearch('catalog\\-fast', ['catalog-fast'])).toBe(true);
  });

  it('matches everything without search text', () => {
    expect(matchesSearch('  ', ['catalog'])).toBe(true);
  });
});
