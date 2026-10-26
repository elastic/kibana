/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramsMock } from './__mocks__/params_match_all';

import { getCategoryCountRequest } from './fetch_category_counts';

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
      [category],
      paramsMock.baselineMin,
      paramsMock.baselineMax,
      1 // no sampling
    );

    expect(query).toEqual({
      index: 'the-index',
      query: {
        bool: {
          filter: [
            { range: { 'the-time-field-name': { gte: 10, lte: 20, format: 'epoch_millis' } } },
          ],
        },
      },
      size: 0,
      track_total_hits: false,
      aggs: {
        category_counts: {
          filters: {
            filters: {
              category_0: {
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
            },
            other_bucket: false,
          },
        },
      },
    });
  });

  it('supports multiple categories', () => {
    const categories = [
      {
        key: 'SLO summary transforms installed and started',
        count: 500,
        examples: ['SLO summary transforms installed and started'],
        regex: '',
      },
      { key: 'Trusted Apps', count: 500, examples: ['Trusted Apps: '], regex: '' },
    ];

    const query = getCategoryCountRequest(
      paramsMock,
      'the-field-name',
      categories,
      1, // no sampling
      paramsMock.baselineMin,
      paramsMock.baselineMax
    );

    const filters =
      (query.aggs?.category_counts as unknown as { filters: { filters: Record<string, unknown> } })
        ?.filters.filters ?? {};

    expect(Object.keys(filters)).toEqual(['category_0', 'category_1']);
  });

  describe('with sampling', () => {
    const category = {
      key: 'test category',
      count: 100,
      examples: ['test example'],
      regex: '',
    };

    it('wraps with random_sampler when probability < 1 is provided', () => {
      const query = getCategoryCountRequest(
        paramsMock,
        'the-field-name',
        [category],
        paramsMock.baselineMin,
        paramsMock.baselineMax,
        0.1
      );

      expect(query.aggs).toHaveProperty('sample');
      expect(query.aggs?.sample).toHaveProperty('random_sampler');
      expect((query.aggs?.sample as Record<string, unknown>).random_sampler).toMatchObject({
        probability: 0.1,
      });
      expect((query.aggs?.sample as Record<string, unknown>).aggs).toHaveProperty(
        'category_counts'
      );
    });

    it('does not wrap when probability is 1 (no sampling)', () => {
      const query = getCategoryCountRequest(
        paramsMock,
        'the-field-name',
        [category],
        paramsMock.baselineMin,
        paramsMock.baselineMax,
        1
      );

      expect(query.aggs).not.toHaveProperty('sample');
      expect(query.aggs).toHaveProperty('category_counts');
    });
  });
});
