/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceField } from '../../types/app_state';
import { transformExpandResponse, transformSearchResponse } from './graph_response_transformers';

const fields = [{ name: 'user', color: '#123456', icon: { id: 'question' } }] as WorkspaceField[];
const response = {
  vertices: [{ field: 'user', term: 'alice' }],
  connections: [
    { source: 0, target: 1, doc_count: 2, weight: 2 },
    { source: 1, target: 2, doc_count: 5, weight: 10 },
  ],
};

describe('graph response transformers', () => {
  it('styles vertices and sizes search edges against the global maximum', () => {
    const result = transformSearchResponse(response, fields);

    expect(result.nodes[0]).toEqual(
      expect.objectContaining({
        field: 'user',
        term: 'alice',
        color: '#123456',
        fieldDef: fields[0],
      })
    );
    expect(result.edges.map(({ width }) => width)).toEqual([2, 10]);
  });

  it('preserves running-maximum edge sizing for expand responses', () => {
    const result = transformExpandResponse(response, fields);

    expect(result.edges.map(({ width }) => width)).toEqual([10, 10]);
  });
});
