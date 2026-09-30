/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdvancedSettings, WorkspaceField } from '../../types/app_state';
import type { WorkspaceNode } from '../../types/workspace_state';
import { buildSearchExploreRequest } from './graph_request_builders';

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
  it('builds nested search hops and blocklist exclusions', () => {
    const request = buildSearchExploreRequest({
      query: { query_string: { query: 'error' } },
      fields,
      numHops: 2,
      blocklistedNodes: [{ data: { field: 'user.name', term: 'blocked-user' } } as WorkspaceNode],
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
