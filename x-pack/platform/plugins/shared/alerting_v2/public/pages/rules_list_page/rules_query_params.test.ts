/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENABLED_FILTER_ID,
  KIND_FILTER_ID,
  TAG_FILTER_ID,
  toRulesQueryParams,
} from './rules_query_params';

describe('toRulesQueryParams', () => {
  it('returns empty params when no filters or search are set', () => {
    expect(toRulesQueryParams({})).toEqual({});
  });

  it('maps free-text search', () => {
    expect(toRulesQueryParams({ search: 'prod' })).toEqual({ search: 'prod' });
  });

  it('omits empty search strings', () => {
    expect(toRulesQueryParams({ search: '' })).toEqual({});
  });

  it('maps enabled status to a KQL filter', () => {
    expect(
      toRulesQueryParams({
        [ENABLED_FILTER_ID]: { include: ['true'] },
      })
    ).toEqual({ filter: 'enabled: true' });
  });

  it('maps kind to a KQL filter', () => {
    expect(
      toRulesQueryParams({
        [KIND_FILTER_ID]: { include: ['signal'] },
      })
    ).toEqual({ filter: 'kind: signal' });
  });

  it('maps tags to a KQL filter', () => {
    expect(
      toRulesQueryParams({
        [TAG_FILTER_ID]: { include: ['prod', 'staging'] },
      })
    ).toEqual({
      filter: '(metadata.tags: "prod" OR metadata.tags: "staging")',
    });
  });

  it('combines enabled, kind, tags, and search', () => {
    expect(
      toRulesQueryParams({
        search: 'cpu',
        [ENABLED_FILTER_ID]: { include: ['false'] },
        [KIND_FILTER_ID]: { include: ['alert'] },
        [TAG_FILTER_ID]: { include: ['prod'] },
      })
    ).toEqual({
      filter: 'enabled: false AND (metadata.tags: "prod") AND kind: alert',
      search: 'cpu',
    });
  });

  it('maps excluded tags to a negated KQL filter', () => {
    expect(
      toRulesQueryParams({
        [TAG_FILTER_ID]: { exclude: ['prod'] },
      })
    ).toEqual({
      filter: 'NOT (metadata.tags: "prod")',
    });
  });

  it('intersects included and excluded tags with free-text search', () => {
    expect(
      toRulesQueryParams({
        search: 'cpu',
        [TAG_FILTER_ID]: { include: ['prod'], exclude: ['staging'] },
      })
    ).toEqual({
      filter: '(metadata.tags: "prod") AND NOT (metadata.tags: "staging")',
      search: 'cpu',
    });
  });

  it('ignores exclusions on the single-select status and kind dimensions', () => {
    expect(
      toRulesQueryParams({
        [ENABLED_FILTER_ID]: { exclude: ['true'] },
        [KIND_FILTER_ID]: { exclude: ['signal'] },
      })
    ).toEqual({});
  });
});
