/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MarkerType, Position } from '@xyflow/react';
import type { KiGraphRenderableFlowNode } from './ki_graph_node';
import {
  applyKiGraphEdgeFocusStyles,
  applyKiGraphEdgeZIndex,
  applyKiGraphNodeZIndex,
} from './ki_graph_flow_z_index';
import type { KiGraphFlowEdge } from './use_ki_graph_layout';

const flowNode = (id: string, zIndex = 0): KiGraphRenderableFlowNode => ({
  id,
  type: 'kiNode',
  position: { x: 0, y: 0 },
  width: 24,
  height: 24,
  zIndex,
  data: {
    kiId: id,
    index: 'idx',
    kind: 'entity',
    subtype: 'person',
    title: id,
    size: 24,
    degree: 1,
    hasNormalLabel: false,
    hasHubLabel: false,
  },
  measured: { width: 24, height: 24 },
  handles: [
    { type: 'target', position: Position.Top, x: 12, y: 12, width: 1, height: 1 },
    { type: 'source', position: Position.Top, x: 12, y: 12, width: 1, height: 1 },
  ],
});

const flowEdge = (
  id: string,
  source: string,
  target: string,
  zIndex = 0,
  stroke = '#888'
): KiGraphFlowEdge => ({
  id,
  source,
  target,
  type: 'kiEdge',
  zIndex,
  data: { relation: 'derived_from' },
  style: { stroke, strokeWidth: 0.5 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 10,
    height: 10,
    color: stroke,
  },
});

describe('applyKiGraphNodeZIndex', () => {
  it('returns the same array reference when z-index values are unchanged', () => {
    const nodes = [flowNode('a', 0), flowNode('b', 0)];
    expect(applyKiGraphNodeZIndex(nodes, undefined, undefined)).toBe(nodes);
  });

  it('reuses unaffected node objects when hover changes z-index for one node', () => {
    const nodes = [flowNode('a', 0), flowNode('b', 0)];
    const next = applyKiGraphNodeZIndex(nodes, 'a', undefined);
    expect(next).not.toBe(nodes);
    expect(next[0]).not.toBe(nodes[0]);
    expect(next[0].zIndex).toBe(2);
    expect(next[1]).toBe(nodes[1]);
  });
});

describe('applyKiGraphEdgeFocusStyles', () => {
  const strokes = { defaultStroke: '#888', highlightStroke: '#06f' };

  it('returns the same array reference when focus is idle and styles already match', () => {
    const edges = [flowEdge('e1', 'a', 'b', 0, strokes.defaultStroke)];
    expect(applyKiGraphEdgeFocusStyles(edges, undefined, undefined, strokes)).toBe(edges);
  });

  it('reuses unaffected edges when focus highlights one edge', () => {
    const edges = [
      flowEdge('e1', 'a', 'b', 0, strokes.defaultStroke),
      flowEdge('e2', 'c', 'd', 0, strokes.defaultStroke),
    ];
    const next = applyKiGraphEdgeFocusStyles(edges, 'a', 'a', strokes);
    expect(next).not.toBe(edges);
    expect(next[0]).not.toBe(edges[0]);
    expect(next[0].style?.stroke).toBe(strokes.highlightStroke);
    expect(next[1]).toBe(edges[1]);
  });
});

describe('applyKiGraphEdgeZIndex', () => {
  it('returns the same array reference when z-index values are unchanged', () => {
    const edges = [flowEdge('e1', 'a', 'b')];
    expect(applyKiGraphEdgeZIndex(edges, undefined)).toBe(edges);
  });

  it('reuses unaffected edges when focus raises z-index on one edge', () => {
    const edges = [flowEdge('e1', 'a', 'b'), flowEdge('e2', 'c', 'd')];
    const next = applyKiGraphEdgeZIndex(edges, 'a');
    expect(next[0]).not.toBe(edges[0]);
    expect(next[0].zIndex).toBe(1);
    expect(next[1]).toBe(edges[1]);
  });
});
