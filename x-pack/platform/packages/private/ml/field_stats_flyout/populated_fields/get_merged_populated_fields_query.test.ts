/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMergedSampleDocsForPopulatedFieldsQuery } from './get_merged_populated_fields_query';

describe('getMergedSampleDocsForPopulatedFieldsQuery()', () => {
  it('should wrap the original query in function_score', () => {
    expect(
      getMergedSampleDocsForPopulatedFieldsQuery({
        searchQuery: { match_all: {} },
        runtimeFields: {},
      })
    ).toStrictEqual({
      query: {
        function_score: { query: { bool: { must: [{ match_all: {} }] } }, random_score: {} },
      },
      runtime_mappings: {},
    });
  });

  it('should append the time range to the query if timeRange and datetimeField are provided', () => {
    expect(
      getMergedSampleDocsForPopulatedFieldsQuery({
        searchQuery: {
          bool: {
            should: [{ match_phrase: { version: '1' } }],
            minimum_should_match: 1,
            filter: [
              {
                terms: {
                  cluster_uuid: '',
                },
              },
            ],
            must_not: [],
          },
        },
        runtimeFields: {},
        timeRange: { from: 1613995874349, to: 1614082617000 },
        datetimeField: '@timestamp',
      })
    ).toStrictEqual({
      query: {
        function_score: {
          query: {
            bool: {
              filter: [
                { terms: { cluster_uuid: '' } },
                {
                  range: {
                    '@timestamp': {
                      format: 'epoch_millis',
                      gte: 1613995874349,
                      lte: 1614082617000,
                    },
                  },
                },
              ],
              minimum_should_match: 1,
              must_not: [],
              should: [{ match_phrase: { version: '1' } }],
            },
          },
          random_score: {},
        },
      },
      runtime_mappings: {},
    });
  });

  it('should not append the time range to the query if datetimeField is undefined', () => {
    expect(
      getMergedSampleDocsForPopulatedFieldsQuery({
        searchQuery: {
          bool: {
            should: [{ match_phrase: { airline: 'AAL' } }],
            minimum_should_match: 1,
            filter: [],
            must_not: [],
          },
        },
        runtimeFields: {},
        timeRange: { from: 1613995874349, to: 1614082617000 },
      })
    ).toStrictEqual({
      query: {
        function_score: {
          query: {
            bool: {
              filter: [],
              minimum_should_match: 1,
              must_not: [],
              should: [{ match_phrase: { airline: 'AAL' } }],
            },
          },
          random_score: {},
        },
      },
      runtime_mappings: {},
    });
  });
});
