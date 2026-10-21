/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceNode } from '../../types/workspace_state';
import { transformFillConnectionsResponse } from './fill_connections';

const nodes = [
  { id: 'field..a', data: { field: 'field', term: 'a' } },
  { id: 'field..b', data: { field: 'field', term: 'b' } },
] as WorkspaceNode[];

describe('fill connections', () => {
  it('converts matrix buckets into limited graph edges', () => {
    const { graph } = transformFillConnectionsResponse({
      response: {
        hits: { total: { value: 10 } },
        aggregations: {
          matrix: {
            buckets: [
              { key: '0', doc_count: 8 },
              { key: '1', doc_count: 6 },
              { key: '0|1', doc_count: 4 },
            ],
          },
        },
      },
      nodes,
      existingEdgeIds: new Set(),
      useSignificance: false,
      minDocCount: 1,
      maxNewEdges: 10,
    });

    expect(graph).toEqual({
      nodes: [
        { field: 'field', term: 'a' },
        { field: 'field', term: 'b' },
      ],
      edges: [{ source: 0, target: 1, weight: 4, width: 5, doc_count: 4 }],
    });
  });
});
