/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSoSearch, RULE_SEARCH_FIELDS } from './build_so_search';

describe('buildSoSearch', () => {
  it('returns undefined for empty input', () => {
    expect(buildSoSearch()).toBeUndefined();
    expect(buildSoSearch('')).toBeUndefined();
    expect(buildSoSearch('   ')).toBeUndefined();
  });

  it('suffixes a single token with *', () => {
    expect(buildSoSearch('prod')).toBe('prod*');
  });

  it('suffixes each token with * for multi-word input', () => {
    expect(buildSoSearch('prod alerts')).toBe('prod* alerts*');
  });

  it('trims leading and trailing whitespace', () => {
    expect(buildSoSearch('  prod alerts  ')).toBe('prod* alerts*');
  });

  it('collapses multiple spaces between tokens', () => {
    expect(buildSoSearch('prod    alerts')).toBe('prod* alerts*');
  });

  it('passes through special characters without escaping', () => {
    expect(buildSoSearch('a--b')).toBe('a--b*');
    expect(buildSoSearch('prod:alerts')).toBe('prod:alerts*');
  });
});

describe('RULE_SEARCH_FIELDS', () => {
  it('contains only text-mapped fields', () => {
    expect(RULE_SEARCH_FIELDS).toEqual(['metadata.name', 'metadata.description']);
  });
});
