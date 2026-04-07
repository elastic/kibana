/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFindRulesSearch, buildRuleSearchQuery } from './build_rule_search';

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

describe('buildFindRulesSearch', () => {
  it('returns undefined when both filter and search are empty', () => {
    expect(buildFindRulesSearch({})).toBeUndefined();
  });

  it('returns the search-only query when no explicit filter is provided', () => {
    expect(buildFindRulesSearch({ search: 'lim' })).toBe(
      '(alerting_rule.attributes.metadata.name: lim* OR alerting_rule.attributes.metadata.tags: lim*)'
    );
  });

  it('combines an existing filter with the search query', () => {
    expect(buildFindRulesSearch({ filter: 'enabled: true', search: 'prod' })).toBe(
      '(alerting_rule.attributes.enabled: true AND (alerting_rule.attributes.metadata.name: prod* OR alerting_rule.attributes.metadata.tags: prod*))'
    );
  });
});
