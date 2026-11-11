/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import {
  FlowHighlightProvider,
  useFlowHighlightState,
  useHoveredFlow,
  withFlowHighlight,
} from './canvas_flow_highlight';
import type { ConnectedFlow } from './connected_flow';
import {
  ANIMATED_EDGE_TYPE,
  DESTINATION_NODE_TYPE,
  SOURCE_NODE_TYPE,
  type ClassicCanvasEdge,
  type ClassicCanvasGraph,
  type ClassicCanvasNode,
} from './types';

const sourceNode = (id: string): ClassicCanvasNode => ({
  id,
  type: SOURCE_NODE_TYPE,
  position: { x: 0, y: 0 },
  data: { title: id, subtitle: '' },
});

const destinationNode = (id: string): ClassicCanvasNode => ({
  id,
  type: DESTINATION_NODE_TYPE,
  position: { x: 0, y: 0 },
  data: { title: id },
});

const edge = (source: string, target: string): ClassicCanvasEdge => ({
  id: `${source}->${target}`,
  type: ANIMATED_EDGE_TYPE,
  source,
  target,
});

// s1 -> d1 and s2 -> d2 are separate flows.
const graph: ClassicCanvasGraph = {
  nodes: [sourceNode('s1'), sourceNode('s2'), destinationNode('d1'), destinationNode('d2')],
  edges: [edge('s1', 'd1'), edge('s2', 'd2')],
};

const mouseEvent = (buttons = 0) => ({ buttons } as React.MouseEvent);

describe('useHoveredFlow', () => {
  it('has no flow until a node is hovered', () => {
    const { result } = renderHook(() => useHoveredFlow(graph));
    expect(result.current.hoveredFlow).toBeUndefined();
  });

  it('resolves the flow of the hovered node and clears it on leave', () => {
    const { result } = renderHook(() => useHoveredFlow(graph));

    act(() => result.current.onNodeMouseEnter(mouseEvent(), graph.nodes[0]));
    expect([...(result.current.hoveredFlow?.nodeIds ?? [])].sort()).toEqual(['d1', 's1']);
    expect([...(result.current.hoveredFlow?.edgeIds ?? [])]).toEqual(['s1->d1']);

    act(() => result.current.onNodeMouseLeave(mouseEvent(), graph.nodes[0]));
    expect(result.current.hoveredFlow).toBeUndefined();
  });

  it('ignores a node entered with a button pressed', () => {
    const { result } = renderHook(() => useHoveredFlow(graph));

    act(() => result.current.onNodeMouseEnter(mouseEvent(1), graph.nodes[0]));
    expect(result.current.hoveredFlow).toBeUndefined();
  });

  it('drops the flow when the hovered node leaves the graph', () => {
    const { result, rerender } = renderHook((props: ClassicCanvasGraph) => useHoveredFlow(props), {
      initialProps: graph,
    });
    act(() => result.current.onNodeMouseEnter(mouseEvent(), graph.nodes[0]));
    expect(result.current.hoveredFlow).toBeDefined();

    rerender({ nodes: graph.nodes.slice(1), edges: graph.edges.slice(1) });
    expect(result.current.hoveredFlow).toBeUndefined();
  });
});

describe('flow highlight state', () => {
  const flow: ConnectedFlow = { nodeIds: new Set(['s1', 'd1']), edgeIds: new Set(['s1->d1']) };

  it('is undefined without a highlighted flow', () => {
    const { result } = renderHook(() => useFlowHighlightState('s1', 'node'));
    expect(result.current).toBeUndefined();
  });

  it('separates the flow from everything else', () => {
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <FlowHighlightProvider value={flow}>{children}</FlowHighlightProvider>
    );
    const stateOf = (id: string, kind: 'node' | 'edge') =>
      renderHook(() => useFlowHighlightState(id, kind), { wrapper }).result.current;

    expect(stateOf('s1', 'node')).toBe('highlighted');
    expect(stateOf('s2', 'node')).toBe('dimmed');
    expect(stateOf('s1->d1', 'edge')).toBe('highlighted');
    expect(stateOf('s2->d2', 'edge')).toBe('dimmed');
  });

  it('fades a wrapped node outside the flow', () => {
    const Node = withFlowHighlight(({ id }: { id: string }) => <span>{id}</span>);
    render(
      <FlowHighlightProvider value={flow}>
        <Node id="s1" />
        <Node id="s2" />
      </FlowHighlightProvider>
    );

    expect(screen.getByText('s1').parentElement).toHaveStyle({ opacity: 1 });
    expect(screen.getByText('s2').parentElement).toHaveStyle({ opacity: 0.2 });
  });
});
