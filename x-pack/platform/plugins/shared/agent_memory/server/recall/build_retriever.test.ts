/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildBeliefFilter,
  buildHybridRecallPipeline,
  buildKeywordRecallPipeline,
} from './build_retriever';

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

const buildTestFilter = (category?: string) =>
  buildBeliefFilter({
    space_id: 'space-1',
    scope_kind: 'user',
    scope_id: 'user-1',
    category,
  });

describe('Agent Memory ES|QL recall builders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds the authoritative body filter independently from the ES|QL pipeline', () => {
    expect(buildTestFilter('preferences')).toEqual({
      bool: {
        filter: [
          { term: { space_id: 'space-1' } },
          { term: { 'memory.scope_kind': 'user' } },
          { term: { 'memory.scope_id': 'user-1' } },
          { term: { deleted: false } },
          expiryFilter,
          { term: { 'memory.category': 'preferences' } },
        ],
      },
    });
    expect(JSON.stringify(buildTestFilter())).not.toContain('memory.provenance.author');
  });

  it('builds a parameterized hybrid FORK and FUSE pipeline', () => {
    const request = buildHybridRecallPipeline({
      query: 'preferred sources',
      limit: 10,
    }).toRequest();

    expect(request.query).toContain('FORK');
    expect(request.query).toContain('MATCH(title,');
    expect(request.query).toContain('MATCH(description,');
    expect(request.query).toContain('MATCH(content.semantic,');
    expect(request.query).toContain('3.0 / (30.0 + age_days)');
    expect(request.query).toContain('FUSE RRF WITH {"rank_constant": 20}');
    expect(request.query).toContain('LIMIT 20');
    expect(request.query).toContain('LIMIT 10');
    expect(request.params).toEqual([
      { lexicalTitleQuery: 'preferred sources' },
      { lexicalDescriptionQuery: 'preferred sources' },
      { semanticQuery: 'preferred sources' },
    ]);
  });

  it('builds a keyword fallback without semantic fusion', () => {
    const request = buildKeywordRecallPipeline({
      query: 'preferred sources',
      limit: 10,
    }).toRequest();

    expect(request.query).toContain('MATCH(title,');
    expect(request.query).toContain('MATCH(description,');
    expect(request.query).toContain('WHERE _score >= 1');
    expect(request.query).not.toContain('content.semantic');
    expect(request.query).not.toContain('FORK');
    expect(request.query).not.toContain('FUSE');
  });
});
