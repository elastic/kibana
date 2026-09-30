/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceNode } from '../../types/workspace_state';
import { transformIntersectionResponse } from './intersections';

const nodes = [
  { id: 'a', label: 'A', numChildren: 0 },
  { id: 'b', label: 'B', numChildren: 2 },
] as WorkspaceNode[];

describe('intersection response transformer', () => {
  it('creates one sorted merge candidate for a node pair', () => {
    const candidates = transformIntersectionResponse(
      {
        aggregations: {
          all: { doc_count: 20 },
          sources: {
            buckets: {
              bg0: {
                doc_count: 5,
                targets: { buckets: { fg0: { doc_count: 5 }, fg1: { doc_count: 3 } } },
              },
              bg1: {
                doc_count: 10,
                targets: { buckets: { fg0: { doc_count: 3 }, fg1: { doc_count: 10 } } },
              },
            },
          },
        },
      },
      nodes
    );

    expect(candidates).toEqual([
      expect.objectContaining({
        id1: 'a',
        id2: 'b',
        term1: 'A',
        term2: 'B(+2)',
        v1: 5,
        v2: 10,
        overlap: 3,
      }),
    ]);
  });
});
