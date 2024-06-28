/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramsSearchQueryMock } from './__mocks__/params_search_query';

import { getHistogramQuery } from './get_histogram_query';

describe('getHistogramQuery', () => {
  it('returns histogram query without additional filters', () => {
    const query = getHistogramQuery(paramsSearchQueryMock);
    expect(query).toEqual({
      bool: {
        filter: [
          {
            bool: {
              filter: [],
              minimum_should_match: 1,
              must_not: [],
              should: [{ term: { 'the-term': { value: 'the-value' } } }],
            },
          },
          {
            range: {
              'the-time-field-name': {
                format: 'epoch_millis',
                gte: 0,
                lte: 50,
              },
            },
          },
        ],
      },
    });
  });

  it('returns histogram query with additional filters', () => {
    const query = getHistogramQuery(paramsSearchQueryMock, [
      {
        term: { ['the-filter-fieldName']: 'the-filter-fieldValue' },
      },
    ]);
    expect(query).toEqual({
      bool: {
        filter: [
          {
            bool: {
              filter: [],
              minimum_should_match: 1,
              must_not: [],
              should: [{ term: { 'the-term': { value: 'the-value' } } }],
            },
          },
          {
            term: {
              'the-filter-fieldName': 'the-filter-fieldValue',
            },
          },
          {
            range: {
              'the-time-field-name': {
                format: 'epoch_millis',
                gte: 0,
                lte: 50,
              },
            },
          },
        ],
      },
    });
  });
});
