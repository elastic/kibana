/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { paramsMock } from './__mocks__/params_match_all';
import { getBaselineOrDeviationFilter, getCategoryRequest } from './fetch_categories';

describe('getBaselineOrDeviationFilter', () => {
  it('returns a filter that matches both baseline and deviation time range', () => {
    const baselineOrDeviationFilter = getBaselineOrDeviationFilter(paramsMock);

    expect(baselineOrDeviationFilter).toEqual({
      bool: {
        should: [
          {
            range: {
              'the-time-field-name': { gte: 10, lte: 20, format: 'epoch_millis' },
            },
          },
          {
            range: {
              'the-time-field-name': { gte: 30, lte: 40, format: 'epoch_millis' },
            },
          },
        ],
      },
    });
  });
});

describe('getCategoryRequest', () => {
  it('returns the category request', () => {
    const randomSamplerWrapper = createRandomSamplerWrapper({
      probability: 0.1,
      seed: 1234,
    });

    const query = getCategoryRequest(paramsMock, 'the-field-name', randomSamplerWrapper);

    // Because the time range filter is covered by the should clauses that cover both
    // baseline (10,20) and deviation (30,40), we expect that there is no other
    // time range filter whatsoever, for example for start/end (0,50).
    expect(query).toEqual({
      index: 'the-index',
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      range: {
                        'the-time-field-name': {
                          gte: 10,
                          lte: 20,
                          format: 'epoch_millis',
                        },
                      },
                    },
                    {
                      range: {
                        'the-time-field-name': {
                          gte: 30,
                          lte: 40,
                          format: 'epoch_millis',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        aggs: {
          sample: {
            random_sampler: { probability: 0.1, seed: 1234 },
            aggs: {
              categories: {
                categorize_text: {
                  field: 'the-field-name',
                  size: 1000,
                },
                aggs: {
                  examples: {
                    top_hits: { size: 4, sort: ['the-time-field-name'], _source: 'the-field-name' },
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});
