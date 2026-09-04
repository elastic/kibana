/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RRF_RANK_CONSTANT,
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

const buildTestFilter = (category?: string, tags?: string[]) => {
  const params = {
    space_id: 'space-1',
    scope_id: 'user-1',
    category,
    tags,
  } as Parameters<typeof buildBeliefFilter>[0] & { tags?: string[] };

  return buildBeliefFilter(params);
};

describe('Agent Memory ES|QL recall builders', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds the authoritative body filter independently from the ES|QL pipeline', () => {
    const scopeOrClause = {
      bool: {
        minimum_should_match: 1,
        should: [
          {
            bool: {
              filter: [
                { term: { 'memory.scope_kind': 'user' } },
                { term: { 'memory.scope_id': 'user-1' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { 'memory.scope_kind': 'space' } },
                { term: { 'memory.scope_id': 'space-1' } },
              ],
            },
          },
        ],
      },
    };

    expect(buildTestFilter('procedures', ['project:phoenix', 'source:workflow'])).toEqual({
      bool: {
        filter: [
          { term: { space_id: 'space-1' } },
          { term: { namespace: 'agent_memory' } },
          scopeOrClause,
          { term: { deleted: false } },
          expiryFilter,
          { term: { 'memory.category': 'procedures' } },
          { term: { tags: 'project:phoenix' } },
          { term: { tags: 'source:workflow' } },
        ],
      },
    });
    expect(JSON.stringify(buildTestFilter())).not.toContain('memory.provenance.author');
  });

  it('builds a parameterized hybrid FORK and FUSE pipeline', () => {
    const limit = 10;
    const candidateLimit = limit * 2;
    const defaultMinScore = 1 / (RRF_RANK_CONSTANT + candidateLimit);
    const request = buildHybridRecallPipeline({
      query: 'preferred sources',
      limit,
    }).toRequest();

    expect(request.query).toContain('FORK');
    expect(request.query).toContain('MATCH(title,');
    expect(request.query).toContain('MATCH(description,');
    expect(request.query).toContain('MATCH(content.semantic,');
    expect(request.query).toContain('3.0 / (30.0 + age_days)');
    expect(request.query).toContain(`FUSE RRF WITH {"rank_constant": ${RRF_RANK_CONSTANT}}`);
    expect(request.query).toContain(`WHERE _score >= ${defaultMinScore}`);
    expect(defaultMinScore).toBeLessThanOrEqual(1 / (RRF_RANK_CONSTANT + 1));
    expect(request.query).toContain('LIMIT 20');
    expect(request.query).toContain('LIMIT 10');
    expect(request.params).toEqual([
      { lexicalTitleQuery: 'preferred sources' },
      { lexicalDescriptionQuery: 'preferred sources' },
      { semanticQuery: 'preferred sources' },
    ]);
  });

  it('allows the hybrid score floor to be tuned by single-leg rank cutoff', () => {
    const rankCutoff = 5;
    const request = buildHybridRecallPipeline({
      query: 'preferred sources',
      limit: 10,
      rankCutoff,
    }).toRequest();

    expect(request.query).toContain(`WHERE _score >= ${1 / (RRF_RANK_CONSTANT + rankCutoff)}`);
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
