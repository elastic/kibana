/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildKeywordRetriever, buildRetriever } from './build_retriever';

const NOW = '2026-08-13T12:34:56.789Z';

const buildTestRetriever = (category?: string) =>
  buildRetriever({
    query: 'preferred sources',
    space_id: 'space-1',
    author: 'user-1',
    category,
    limit: 10,
  });

describe('buildRetriever', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('applies access, tombstone, and root expiry predicates to the shared RRF filter', () => {
    const retriever = buildTestRetriever();

    expect(retriever).toEqual({
      rrf: expect.objectContaining({
        retrievers: expect.arrayContaining([
          expect.objectContaining({ standard: expect.any(Object) }),
          expect.objectContaining({ linear: expect.any(Object) }),
        ]),
        filter: {
          bool: {
            filter: [
              { term: { space_id: 'space-1' } },
              { term: { 'memory.provenance.author': 'user-1' } },
              { term: { deleted: false } },
              {
                bool: {
                  should: [
                    { bool: { must_not: { exists: { field: 'expires_at' } } } },
                    { range: { expires_at: { gt: NOW } } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      }),
    });
    expect(retriever).toHaveProperty('rrf.retrievers.length', 2);
  });

  it('adds the requested category to the shared RRF filter', () => {
    expect(buildTestRetriever('preferences')).toEqual({
      rrf: expect.objectContaining({
        filter: {
          bool: {
            filter: expect.arrayContaining([{ term: { 'memory.category': 'preferences' } }]),
          },
        },
      }),
    });
  });

  it('boosts recent BM25 matches without adding a recency-only RRF leg', () => {
    expect(buildTestRetriever()).toEqual({
      rrf: expect.objectContaining({
        retrievers: expect.arrayContaining([
          {
            standard: {
              query: {
                bool: {
                  must: [
                    {
                      multi_match: {
                        query: 'preferred sources',
                        fields: ['title^2', 'description'],
                        type: 'best_fields',
                      },
                    },
                  ],
                  should: [
                    {
                      distance_feature: {
                        field: '@timestamp',
                        origin: 'now',
                        pivot: '30d',
                        boost: 0.1,
                      },
                    },
                  ],
                },
              },
            },
          },
        ]),
      }),
    });
    expect(buildTestRetriever()).toHaveProperty('rrf.retrievers.length', 2);
  });

  it('queries the inherited semantic content field', () => {
    expect(buildTestRetriever()).toEqual({
      rrf: expect.objectContaining({
        retrievers: expect.arrayContaining([
          {
            linear: {
              retrievers: [
                {
                  retriever: {
                    standard: {
                      query: {
                        match: {
                          'content.semantic': 'preferred sources',
                        },
                      },
                    },
                  },
                  weight: 1,
                  normalizer: 'minmax',
                },
              ],
              rank_window_size: 20,
            },
          },
        ]),
      }),
    });
  });

  it('builds keyword-only retrieval with the same mandatory and category filters', () => {
    expect(buildKeywordRetriever).toBeDefined();
    expect(
      buildKeywordRetriever({
        query: 'preferred sources',
        space_id: 'space-1',
        author: 'user-1',
        category: 'preferences',
        limit: 10,
      })
    ).toEqual({
      standard: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: 'preferred sources',
                  fields: ['title^2', 'description'],
                  type: 'best_fields',
                },
              },
            ],
            should: [
              {
                distance_feature: {
                  field: '@timestamp',
                  origin: 'now',
                  pivot: '30d',
                  boost: 0.1,
                },
              },
            ],
          },
        },
        filter: {
          bool: {
            filter: [
              { term: { space_id: 'space-1' } },
              { term: { 'memory.provenance.author': 'user-1' } },
              { term: { deleted: false } },
              {
                bool: {
                  should: [
                    { bool: { must_not: { exists: { field: 'expires_at' } } } },
                    { range: { expires_at: { gt: NOW } } },
                  ],
                  minimum_should_match: 1,
                },
              },
              { term: { 'memory.category': 'preferences' } },
            ],
          },
        },
      },
    });
  });
});
