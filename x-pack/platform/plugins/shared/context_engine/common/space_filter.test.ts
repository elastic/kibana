/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AI_INDEX_PRIVILEGES_PATH,
  buildAiIndexReadFilter,
  buildAiIndexSpaceFilter,
  buildAiIndexUserFilter,
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

describe('buildAiIndexUserFilter', () => {
  it('matches documents without a user_id or with the given one', () => {
    expect(buildAiIndexUserFilter('alice')).toEqual({
      bool: {
        should: [
          { bool: { must_not: { exists: { field: 'user_id' } } } },
          { term: { user_id: 'alice' } },
        ],
        minimum_should_match: 1,
      },
    });
  });
});

describe('buildAiIndexReadFilter', () => {
  it('is the space filter alone without a user id', () => {
    expect(buildAiIndexReadFilter({ spaceId: 'marketing' })).toEqual(
      buildAiIndexSpaceFilter('marketing')
    );
  });

  it('requires both the space and user filters with a user id', () => {
    expect(buildAiIndexReadFilter({ spaceId: 'marketing', userId: 'alice' })).toEqual({
      bool: {
        filter: [buildAiIndexSpaceFilter('marketing'), buildAiIndexUserFilter('alice')],
      },
    });
  });
});
