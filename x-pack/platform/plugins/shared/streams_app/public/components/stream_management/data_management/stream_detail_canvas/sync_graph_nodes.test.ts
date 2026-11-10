/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syncCanvasEdgeData } from './sync_graph_nodes';
import type { ClassicCanvasEdge } from './types';

const edge = (id: string, data: ClassicCanvasEdge['data']): ClassicCanvasEdge => ({
  id,
  source: 'a',
  target: 'b',
  data,
});

describe('syncCanvasEdgeData', () => {
  it('keeps the live edges when their data is unchanged', () => {
    const current = [edge('e1', { editable: true, forwarding: 'direct' })];
    expect(
      syncCanvasEdgeData(current, [edge('e1', { editable: true, forwarding: 'direct' })])
    ).toBe(current);
  });

  it('merges new data onto the live edge with the same id', () => {
    const live = { ...edge('e1', { editable: true, forwarding: 'direct' }), selected: true };
    const routingLine = { origin: { kind: 'source' as const, id: 'src' }, destinationId: 'es' };

    const [synced] = syncCanvasEdgeData(
      [live],
      [edge('e1', { editable: true, forwarding: 'direct', routingLine })]
    );

    expect(synced).toEqual({
      ...live,
      data: { editable: true, forwarding: 'direct', routingLine },
    });
  });
});
