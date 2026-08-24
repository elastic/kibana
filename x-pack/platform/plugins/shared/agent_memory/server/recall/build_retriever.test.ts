/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildKeywordRetriever, buildRetriever } from './build_retriever';

const NOW = '2026-08-13T12:34:56.789Z';
const expiryFilter = {
  bool: {
    should: [
      { bool: { must_not: { exists: { field: 'expires_at' } } } },
      { range: { expires_at: { gt: NOW } } },
    ],
    minimum_should_match: 1,
  },
};

const buildTestRetriever = (category?: string) =>
  buildRetriever({
    query: 'preferred sources',
    space_id: 'space-1',
    scope_kind: 'user',
    scope_id: 'user-1',
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

  it('builds hybrid retrieval with authoritative scope and lifecycle filters', () => {
    const retriever = buildTestRetriever('preferences');

    expect(retriever).toEqual({
      rrf: expect.objectContaining({
        retrievers: expect.arrayContaining([
          expect.objectContaining({
            standard: expect.objectContaining({
              query: expect.objectContaining({
                bool: expect.objectContaining({
                  must: expect.arrayContaining([
                    expect.objectContaining({ multi_match: expect.any(Object) }),
                  ]),
                  should: expect.arrayContaining([
                    expect.objectContaining({ distance_feature: expect.any(Object) }),
                  ]),
                }),
              }),
            }),
          }),
          expect.objectContaining({
            linear: expect.objectContaining({
              retrievers: expect.arrayContaining([
                expect.objectContaining({
                  retriever: expect.objectContaining({
                    standard: expect.objectContaining({
                      query: { match: { 'content.semantic': 'preferred sources' } },
                    }),
                  }),
                }),
              ]),
            }),
          }),
        ]),
        filter: {
          bool: {
            filter: expect.arrayContaining([
              { term: { space_id: 'space-1' } },
              { term: { 'memory.scope_kind': 'user' } },
              { term: { 'memory.scope_id': 'user-1' } },
              { term: { deleted: false } },
              { term: { 'memory.category': 'preferences' } },
              expiryFilter,
            ]),
          },
        },
      }),
    });
    expect(retriever).toHaveProperty('rrf.retrievers.length', 2);
    expect(JSON.stringify(retriever)).not.toContain('memory.provenance.author');
  });

  it('builds keyword retrieval with the same authoritative filters and no semantic leg', () => {
    const retriever = buildKeywordRetriever({
      query: 'preferred sources',
      space_id: 'space-1',
      scope_kind: 'user',
      scope_id: 'user-1',
      category: 'preferences',
      limit: 10,
    });

    expect(retriever).toEqual({
      standard: expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            must: expect.arrayContaining([
              expect.objectContaining({ multi_match: expect.any(Object) }),
            ]),
          }),
        }),
        filter: {
          bool: {
            filter: expect.arrayContaining([
              { term: { space_id: 'space-1' } },
              { term: { 'memory.scope_kind': 'user' } },
              { term: { 'memory.scope_id': 'user-1' } },
              { term: { deleted: false } },
              { term: { 'memory.category': 'preferences' } },
              expiryFilter,
            ]),
          },
        },
      }),
    });
    expect(retriever).not.toHaveProperty('rrf');
    expect(JSON.stringify(retriever)).not.toContain('content.semantic');
    expect(JSON.stringify(retriever)).not.toContain('memory.provenance.author');
  });
});
