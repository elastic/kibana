/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AI_INDEX_PRIVILEGES_PATH,
  buildAiIndexReadFilter,
  buildAiIndexScopeFilter,
  buildAiIndexSpaceFilter,
} from './space_filter';

describe('buildAiIndexSpaceFilter', () => {
  it('matches documents scoped to the space or to the global wildcard', () => {
    expect(buildAiIndexSpaceFilter('marketing')).toEqual({
      bool: {
        should: [
          {
            bool: {
              must_not: {
                nested: {
                  path: AI_INDEX_PRIVILEGES_PATH,
                  query: { match_all: {} },
                  ignore_unmapped: true,
                },
              },
            },
          },
          {
            nested: {
              path: AI_INDEX_PRIVILEGES_PATH,
              ignore_unmapped: true,
              query: {
                bool: {
                  should: [
                    { term: { [`${AI_INDEX_PRIVILEGES_PATH}.space`]: 'marketing' } },
                    { term: { [`${AI_INDEX_PRIVILEGES_PATH}.space`]: '*' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });
});

describe('buildAiIndexScopeFilter', () => {
  it('matches unscoped documents or ones scoped to the caller', () => {
    expect(buildAiIndexScopeFilter(['user://u_1'])).toEqual({
      bool: {
        should: [
          { bool: { must_not: { exists: { field: 'scope_id' } } } },
          { terms: { scope_id: ['user://u_1'] } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('matches only unscoped documents for a caller without scope ids', () => {
    expect(buildAiIndexScopeFilter([])).toEqual({
      bool: {
        should: [{ bool: { must_not: { exists: { field: 'scope_id' } } } }],
        minimum_should_match: 1,
      },
    });
  });
});

describe('buildAiIndexReadFilter', () => {
  it('requires both the space and scope filters', () => {
    expect(buildAiIndexReadFilter({ spaceId: 'marketing', scopeIds: ['user://u_1'] })).toEqual({
      bool: {
        filter: [buildAiIndexSpaceFilter('marketing'), buildAiIndexScopeFilter(['user://u_1'])],
      },
    });
  });
});
