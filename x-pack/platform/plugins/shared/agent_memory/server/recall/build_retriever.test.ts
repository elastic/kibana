/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRetriever } from './build_retriever';

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

  it('applies the exact lifecycle and access predicates to the shared RRF filter', () => {
    const retriever = buildTestRetriever();

    expect(retriever).toEqual({
      rrf: expect.objectContaining({
        filter: {
          bool: {
            filter: expect.arrayContaining([
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
              {
                bool: {
                  must_not: { exists: { field: 'memory.expired_at' } },
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        must_not: { exists: { field: 'memory.suppress_until' } },
                      },
                    },
                    { range: { 'memory.suppress_until': { lte: NOW } } },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    { bool: { must_not: { exists: { field: 'memory.valid_at' } } } },
                    { range: { 'memory.valid_at': { lte: NOW } } },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    { bool: { must_not: { exists: { field: 'memory.invalid_at' } } } },
                    { range: { 'memory.invalid_at': { gt: NOW } } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ]),
          },
        },
      }),
    });
    expect(retriever).toHaveProperty('rrf.filter.bool.filter.length', 8);
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
});
