/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramsMock } from './__mocks__/params_match_all';

import { getCategoryCountRequest, getCategoryCountMSearchRequest } from './fetch_category_counts';

describe('getCategoryCountRequest', () => {
  it('returns the category count request', () => {
    const category = {
      key: 'runTask ended no files to process',
      count: 667,
      examples: ['[runTask()] ended: no files to process'],
      regex: '',
    };

    const query = getCategoryCountRequest(
      paramsMock,
      'the-field-name',
      category,
      paramsMock.baselineMin,
      paramsMock.baselineMax
    );

    expect(query).toEqual({
      index: 'the-index',
      body: {
        query: {
          bool: {
            filter: [
              { range: { 'the-time-field-name': { gte: 10, lte: 20, format: 'epoch_millis' } } },
              {
                bool: {
                  should: [
                    {
                      match: {
                        'the-field-name': {
                          auto_generate_synonyms_phrase_query: false,
                          fuzziness: 0,
                          operator: 'and',
                          query: 'runTask ended no files to process',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        size: 0,
        track_total_hits: true,
      },
    });
  });
});

describe('getCategoryCountMSearchRequest', () => {
  it('returns the request body for the msearch request', () => {
    const categories = [
      {
        key: 'SLO summary transforms installed and started',
        count: 500,
        examples: ['SLO summary transforms installed and started'],
        regex: '',
      },
      { key: 'Trusted Apps', count: 500, examples: ['Trusted Apps: '], regex: '' },
    ];

    const query = getCategoryCountMSearchRequest(
      paramsMock,
      'the-field-name',
      categories,
      paramsMock.baselineMin,
      paramsMock.baselineMax
    );

    expect(query).toEqual([
      { index: 'the-index' },
      {
        query: {
          bool: {
            filter: [
              { range: { 'the-time-field-name': { gte: 10, lte: 20, format: 'epoch_millis' } } },
              {
                bool: {
                  should: [
                    {
                      match: {
                        'the-field-name': {
                          auto_generate_synonyms_phrase_query: false,
                          fuzziness: 0,
                          operator: 'and',
                          query: 'SLO summary transforms installed and started',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        size: 0,
        track_total_hits: true,
      },
      { index: 'the-index' },
      {
        query: {
          bool: {
            filter: [
              { range: { 'the-time-field-name': { gte: 10, lte: 20, format: 'epoch_millis' } } },
              {
                bool: {
                  should: [
                    {
                      match: {
                        'the-field-name': {
                          auto_generate_synonyms_phrase_query: false,
                          fuzziness: 0,
                          operator: 'and',
                          query: 'Trusted Apps',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        size: 0,
        track_total_hits: true,
      },
    ]);
  });
});
