/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ENTITY_ALIASES, buildEntityKey, mergeAliases, slugify } from './entity_type';

describe('entity keys', () => {
  it('builds the same key for the same kind and name, whatever the spelling', () => {
    expect(buildEntityKey('team', 'Search Relevance')).toBe('team:search-relevance');
    expect(buildEntityKey('team', '  search_relevance! ')).toBe('team:search-relevance');
    expect(buildEntityKey('system', 'Search Relevance')).toBe('system:search-relevance');
  });

  it('drops accents and anything that is not a letter or digit', () => {
    expect(slugify('Café — Orders (v2)')).toBe('cafe-orders-v2');
    expect(slugify('!!!')).toBe('');
  });
});

describe('mergeAliases', () => {
  it('trims, dedupes without regard to case, and drops the entity name', () => {
    expect(mergeAliases('Search team', ['ST', ' st '], ['search TEAM', 'Search'])).toEqual([
      'ST',
      'Search',
    ]);
  });

  it('keeps at most the maximum number of aliases', () => {
    const many = Array.from({ length: MAX_ENTITY_ALIASES + 5 }, (_, index) => `alias ${index}`);

    expect(mergeAliases('name', many)).toHaveLength(MAX_ENTITY_ALIASES);
  });
});
