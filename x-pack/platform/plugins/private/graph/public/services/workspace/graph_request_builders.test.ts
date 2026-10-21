/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdvancedSettings, WorkspaceField } from '../../types/app_state';
import {
  buildExpandExploreRequest,
  buildFillConnectionsRequest,
  buildIntersectionRequest,
  buildNodeQuery,
  buildSearchExploreRequest,
} from './graph_request_builders';

const settings: AdvancedSettings = {
  sampleSize: 100,
  useSignificance: true,
  minDocCount: 3,
  maxValuesPerDoc: 1,
  timeoutMillis: 5000,
};

const fields = [
  { name: 'user.name', hopSize: 5 },
  { name: 'host.name', hopSize: 10 },
] as WorkspaceField[];

describe('graph request builders', () => {
  it('builds queries for simple and grouped nodes', () => {
    const user = { data: { field: 'user', term: 'alice' } };
    const secondUser = { data: { field: 'user', term: 'bob' } };
    const host = { data: { field: 'host', term: 'server-1' } };

    expect(buildNodeQuery([user])).toEqual({ term: { user: 'alice' } });
    expect(buildNodeQuery([user, secondUser])).toEqual({
      terms: { user: ['alice', 'bob'] },
    });
    expect(buildNodeQuery([user, host])).toEqual({
      bool: {
        should: [{ terms: { user: ['alice'] } }, { terms: { host: ['server-1'] } }],
      },
    });
  });

  it('builds intersection filters from ordered node queries', () => {
    const firstQuery = { term: { user: 'alice' } };
    const secondQuery = { term: { host: 'server-1' } };

    expect(buildIntersectionRequest([firstQuery, secondQuery])).toEqual({
      query: { bool: { should: [firstQuery, secondQuery] } },
      size: 0,
      aggs: {
        all: { global: {} },
        sources: {
          filters: { filters: { bg0: firstQuery, bg1: secondQuery } },
          aggs: {
            targets: { filters: { filters: { fg0: firstQuery, fg1: secondQuery } } },
          },
        },
      },
    });
  });

  it('builds an adjacency matrix request from ordered node queries', () => {
    const firstQuery = { term: { user: 'alice' } };
    const secondQuery = { term: { host: 'server-1' } };

    expect(buildFillConnectionsRequest([firstQuery, secondQuery])).toEqual({
      size: 0,
      query: {
        bool: {
          minimum_should_match: 2,
          should: [firstQuery, secondQuery],
        },
      },
      aggs: {
        matrix: {
          adjacency_matrix: {
            separator: '|',
            filters: { 0: firstQuery, 1: secondQuery },
          },
        },
      },
    });
  });

  it('builds expand vertices with boosts and exclusions', () => {
    const startNode = {
      data: { field: 'user.name', term: 'alice', weight: 7 },
    };
    const request = buildExpandExploreRequest({
      startNodes: [startNode],
      existingNodes: [startNode],
      blocklistedNodes: [{ data: { field: 'host.name', term: 'blocked-host' } }],
      fields,
      settings,
    });

    expect(request).toEqual({
      controls: {
        use_significance: true,
        sample_size: 100,
        timeout: 5000,
      },
      vertices: [
        {
          field: 'user.name',
          include: [{ term: 'alice', boost: 7 }],
          min_doc_count: 3,
        },
      ],
      connections: {
        vertices: [
          {
            field: 'user.name',
            size: 5,
            min_doc_count: 3,
            exclude: ['alice'],
          },
          {
            field: 'host.name',
            size: 10,
            min_doc_count: 3,
            exclude: ['blocked-host'],
          },
        ],
      },
    });
  });

  it('builds nested search hops and blocklist exclusions', () => {
    const request = buildSearchExploreRequest({
      query: { query_string: { query: 'error' } },
      fields,
      numHops: 2,
      blocklistedNodes: [{ data: { field: 'user.name', term: 'blocked-user' } }],
      settings,
    });

    expect(request).toEqual({
      query: {
        bool: {
          must: [{ query_string: { query: 'error' } }],
          must_not: [{ term: { 'user.name': 'blocked-user' } }],
        },
      },
      controls: {
        use_significance: true,
        sample_size: 100,
        timeout: 5000,
      },
      vertices: [
        {
          field: 'user.name',
          size: 5,
          min_doc_count: 3,
          exclude: ['blocked-user'],
        },
        { field: 'host.name', size: 10, min_doc_count: 3 },
      ],
      connections: {
        vertices: [
          {
            field: 'user.name',
            size: 5,
            min_doc_count: 3,
            exclude: ['blocked-user'],
          },
          { field: 'host.name', size: 10, min_doc_count: 3 },
        ],
      },
    });
  });
});
