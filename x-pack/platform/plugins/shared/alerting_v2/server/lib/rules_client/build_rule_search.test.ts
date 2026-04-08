/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFindRulesSearch } from './build_rule_search';

describe('buildFindRulesSearch', () => {
  it('returns undefined when both filter and search are empty', () => {
    expect(buildFindRulesSearch({})).toBeUndefined();
  });

  it('returns the search-only query when no explicit filter is provided', () => {
    expect(buildFindRulesSearch({ search: 'lim' })).toBe(
      '(alerting_rule.attributes.metadata.name: lim* OR alerting_rule.attributes.metadata.description: lim* OR alerting_rule.attributes.metadata.tags: lim* OR alerting_rule.attributes.grouping.fields: lim*)'
    );
  });

  it('combines an existing filter with the search query', () => {
    expect(buildFindRulesSearch({ filter: 'enabled: true', search: 'prod' })).toBe(
      '(alerting_rule.attributes.enabled: true AND (alerting_rule.attributes.metadata.name: prod* OR alerting_rule.attributes.metadata.description: prod* OR alerting_rule.attributes.metadata.tags: prod* OR alerting_rule.attributes.grouping.fields: prod*))'
    );
  });
});
