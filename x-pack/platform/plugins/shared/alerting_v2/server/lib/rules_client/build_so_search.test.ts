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

  it('escapes simple_query_string operators', () => {
    expect(buildSoSearch('a--b')).toBe('a\\-\\-b*');
    expect(buildSoSearch('rule+name')).toBe('rule\\+name*');
    expect(buildSoSearch('(test)')).toBe('\\(test\\)*');
    expect(buildSoSearch('"quoted"')).toBe('\\"quoted\\"*');
    expect(buildSoSearch('wild*card')).toBe('wild\\*card*');
    expect(buildSoSearch('fuzzy~2')).toBe('fuzzy\\~2*');
    expect(buildSoSearch('back\\slash')).toBe('back\\\\slash*');
    expect(buildSoSearch('a|b')).toBe('a\\|b*');
  });

  it('leaves non-operator special characters as-is', () => {
    expect(buildSoSearch('prod:alerts')).toBe('prod:alerts*');
    expect(buildSoSearch('#channel')).toBe('#channel*');
    expect(buildSoSearch('rule@team')).toBe('rule@team*');
  });
});

describe('RULE_SEARCH_FIELDS', () => {
  it('contains only text-mapped fields', () => {
    expect(RULE_SEARCH_FIELDS).toEqual(['metadata.name', 'metadata.description']);
  });
});
