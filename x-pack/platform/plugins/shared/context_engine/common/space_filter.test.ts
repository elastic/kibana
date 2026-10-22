/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AI_INDEX_PRIVILEGES_PATH,
  buildAiIndexReadFilter,
  buildAiIndexSliceFilter,
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

describe('buildAiIndexSliceFilter', () => {
  it('matches unsliced documents or the caller slice', () => {
    expect(buildAiIndexSliceFilter('u_1')).toEqual({
      bool: {
        should: [
          { bool: { must_not: { exists: { field: '_slice' } } } },
          { term: { _slice: 'u_1' } },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('matches only unsliced documents without a caller slice', () => {
    expect(buildAiIndexSliceFilter(undefined)).toEqual({
      bool: {
        should: [{ bool: { must_not: { exists: { field: '_slice' } } } }],
        minimum_should_match: 1,
      },
    });
  });
});

describe('buildAiIndexReadFilter', () => {
  it('requires both the space and slice filters', () => {
    expect(buildAiIndexReadFilter({ spaceId: 'marketing', slice: 'u_1' })).toEqual({
      bool: {
        filter: [buildAiIndexSpaceFilter('marketing'), buildAiIndexSliceFilter('u_1')],
      },
    });
  });
});
