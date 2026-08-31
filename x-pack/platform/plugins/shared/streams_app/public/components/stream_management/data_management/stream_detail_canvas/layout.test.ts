/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COLUMN_GAP } from './canvas_constants';
import { applyLayout, layoutGraph } from './layout';

describe('layoutGraph', () => {
  it('returns an empty map for no nodes', () => {
    expect(layoutGraph([], []).size).toBe(0);
  });

  it('places a source -> destination pair in successive columns on the same row', () => {
    const positions = layoutGraph(
      [{ id: 'source' }, { id: 'destination' }],
      [{ source: 'source', target: 'destination' }]
    );

    const source = positions.get('source')!;
    const destination = positions.get('destination')!;

    expect(source.x).toBe(0);
    expect(destination.x).toBe(COLUMN_GAP);
    // A 1:1 chain shares a row so the connector is a straight horizontal line.
    expect(source.y).toBe(destination.y);
  });

  it('stacks independent flows on distinct rows, each starting in column 0', () => {
    const positions = layoutGraph(
      [{ id: 's1' }, { id: 'd1' }, { id: 's2' }, { id: 'd2' }],
      [
        { source: 's1', target: 'd1' },
        { source: 's2', target: 'd2' },
      ]
    );

    expect(positions.get('s1')!.x).toBe(0);
    expect(positions.get('s2')!.x).toBe(0);
    expect(positions.get('s1')!.y).not.toEqual(positions.get('s2')!.y);
  });

  it('lays a multi-node chain into one column per depth (extensible topology)', () => {
    const positions = layoutGraph(
      [{ id: 'source' }, { id: 'pipeline' }, { id: 'destination' }],
      [
        { source: 'source', target: 'pipeline' },
        { source: 'pipeline', target: 'destination' },
      ]
    );

    expect(positions.get('source')!.x).toBe(0);
    expect(positions.get('pipeline')!.x).toBe(COLUMN_GAP);
    expect(positions.get('destination')!.x).toBe(COLUMN_GAP * 2);
  });
});

describe('applyLayout', () => {
  const edges = [{ source: 'source', target: 'destination' }];

  it('repositions every node and preserves other node properties', () => {
    const nodes = [
      { id: 'source', position: { x: 999, y: 999 }, type: 'source', data: { keep: true } },
      { id: 'destination', position: { x: -50, y: 5 }, type: 'destination' },
    ];

    const result = applyLayout(nodes, edges);
    const source = result.find((node) => node.id === 'source')!;
    const destination = result.find((node) => node.id === 'destination')!;

    expect(source.position).toEqual({ x: 0, y: 0 });
    expect(destination.position.x).toBe(COLUMN_GAP);
    expect(source.position.y).toBe(destination.position.y);
    // Non-position fields survive the re-layout.
    expect(source.type).toBe('source');
    expect(source.data).toEqual({ keep: true });
  });

  it('tidies only the selection and anchors it to the selection top-left', () => {
    const nodes = [
      { id: 'source', position: { x: 100, y: 200 } },
      { id: 'destination', position: { x: 900, y: 800 } },
      { id: 'other', position: { x: 42, y: 42 } },
    ];

    const result = applyLayout(nodes, edges, { onlyIds: new Set(['source', 'destination']) });
    const source = result.find((node) => node.id === 'source')!;
    const destination = result.find((node) => node.id === 'destination')!;
    const other = result.find((node) => node.id === 'other')!;

    // Nodes outside the selection are left exactly where they were.
    expect(other.position).toEqual({ x: 42, y: 42 });
    // The tidied block keeps the selection's current top-left corner.
    expect(source.position).toEqual({ x: 100, y: 200 });
    expect(destination.position.x).toBe(100 + COLUMN_GAP);
    expect(source.position.y).toBe(destination.position.y);
  });

  it('returns the input untouched when the selection is empty', () => {
    const nodes = [{ id: 'source', position: { x: 1, y: 2 } }];
    expect(applyLayout(nodes, edges, { onlyIds: new Set() })).toBe(nodes);
  });
});
