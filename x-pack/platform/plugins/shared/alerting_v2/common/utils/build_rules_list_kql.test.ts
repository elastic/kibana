/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildApiRulesListCombinedFilter, buildRuleSearchQuery } from './build_rules_list_kql';

describe('buildRuleSearchQuery', () => {
  it('returns undefined for empty input', () => {
    expect(buildRuleSearchQuery()).toBeUndefined();
    expect(buildRuleSearchQuery('')).toBeUndefined();
    expect(buildRuleSearchQuery('   ')).toBeUndefined();
  });

  it('builds prefix search across name and tags', () => {
    expect(buildRuleSearchQuery('lim')).toBe('(metadata.name: lim* OR metadata.tags: lim*)');
  });

  it('builds an AND query for multiple words', () => {
    expect(buildRuleSearchQuery('prod alerts')).toBe(
      '(metadata.name: prod* OR metadata.tags: prod*) AND (metadata.name: alerts* OR metadata.tags: alerts*)'
    );
  });

  it('escapes special characters with escapeKuery', () => {
    expect(buildRuleSearchQuery('prod:alerts')).toBe(
      '(metadata.name: prod\\:alerts* OR metadata.tags: prod\\:alerts*)'
    );
  });

  it('normalizes leading punctuation so name searches can still match analyzed text', () => {
    expect(buildRuleSearchQuery('#1')).toBe('(metadata.name: 1* OR metadata.tags: 1*)');
  });
});

describe('buildApiRulesListCombinedFilter', () => {
  it('returns undefined when both filter and search are empty', () => {
    expect(buildApiRulesListCombinedFilter({})).toBeUndefined();
    expect(buildApiRulesListCombinedFilter({ filter: '', search: '' })).toBeUndefined();
  });

  it('returns filter only when search is empty', () => {
    expect(buildApiRulesListCombinedFilter({ filter: 'kind: alert' })).toBe('kind: alert');
  });

  it('returns search clause only when filter is empty', () => {
    expect(buildApiRulesListCombinedFilter({ search: 'lim' })).toBe(
      '(metadata.name: lim* OR metadata.tags: lim*)'
    );
  });

  it('parenthesizes filter and search when both are set', () => {
    expect(buildApiRulesListCombinedFilter({ filter: 'enabled: true', search: 'prod' })).toBe(
      '(enabled: true) AND ((metadata.name: prod* OR metadata.tags: prod*))'
    );
  });
});
