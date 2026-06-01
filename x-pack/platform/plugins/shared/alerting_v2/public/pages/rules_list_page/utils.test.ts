/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRulesListFilter } from './utils';

describe('buildRulesListFilter', () => {
  it('returns undefined when no filters are selected', () => {
    expect(buildRulesListFilter({})).toBeUndefined();
  });

  it('builds a combined KQL filter for status and mode', () => {
    expect(buildRulesListFilter({ enabled: 'false', kind: 'signal' })).toBe(
      'enabled: false AND kind: signal'
    );
  });

  it('builds a KQL filter for a single tag', () => {
    expect(buildRulesListFilter({ tags: ['prod'] })).toBe('(metadata.tags: "prod")');
  });

  it('builds a KQL OR filter for multiple tags', () => {
    expect(buildRulesListFilter({ tags: ['prod', 'staging'] })).toBe(
      '(metadata.tags: "prod" OR metadata.tags: "staging")'
    );
  });

  it('combines status, tags, and mode into a single KQL filter', () => {
    expect(buildRulesListFilter({ enabled: 'true', tags: ['prod'], kind: 'alert' })).toBe(
      'enabled: true AND (metadata.tags: "prod") AND kind: alert'
    );
  });

  it('escapes double quotes in tag values', () => {
    expect(buildRulesListFilter({ tags: ['my "special" tag'] })).toBe(
      '(metadata.tags: "my \\"special\\" tag")'
    );
  });

  it('escapes backslashes in tag values before escaping double quotes', () => {
    expect(buildRulesListFilter({ tags: ['test\\'] })).toBe('(metadata.tags: "test\\\\")');
  });
});
