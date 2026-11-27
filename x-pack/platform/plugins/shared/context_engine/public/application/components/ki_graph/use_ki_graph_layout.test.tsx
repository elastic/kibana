/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { forceLayout } from './force_layout';
import { getKiGraphNodeSize } from './ki_graph_node_size';
import type { KiGraph, KiGraphNodeData } from './types';
import {
  DEFAULT_KI_GRAPH_LAYOUT_TUNING_PARAMS,
  getDegreeById,
  useKiGraphLayout,
} from './use_ki_graph_layout';

const node = (kiId: string, overrides: Partial<KiGraphNodeData> = {}): KiGraphNodeData => ({
  kiId,
  index: 'idx',
  kind: 'fact',
  subtype: 'test',
  title: kiId,
  ...overrides,
});

const buildStarGraph = (leafCount: number): KiGraph => {
  const nodes: KiGraphNodeData[] = [node('hub')];
  const edges = [];
  for (let i = 0; i < leafCount; i++) {
    const leafId = `leaf-${i}`;
    nodes.push(node(leafId));
    edges.push({
      id: `hub-${leafId}`,
      source: 'hub',
      target: leafId,
      relation: 'derived_from',
    });
  }
  return { nodes, edges, truncated: false };
};

const expectedCenters = (graph: KiGraph) => {
  const degreeById = getDegreeById(graph);
  const { force, center, nodeSize } = DEFAULT_KI_GRAPH_LAYOUT_TUNING_PARAMS;
  const layoutNodes = graph.nodes.map((item) => {
    const degree = degreeById.get(item.kiId) ?? 0;
    const size = getKiGraphNodeSize(item, degree, nodeSize);
    return { id: item.kiId, radius: size / 2 };
  });
  return forceLayout(
    layoutNodes,
    graph.edges.map(({ source, target }) => ({ source, target })),
    force,
    center
  );
};

const runLayoutToIdle = (advance: () => void, isRunning: () => boolean) => {
  const maxFrames = 5000;
  for (let i = 0; i < maxFrames && isRunning(); i++) {
    act(() => advance());
  }
};

describe('useKiGraphLayout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports running then idle with positions matching forceLayout', () => {
    const graph = buildStarGraph(8);
    const { result } = renderHook(() => useKiGraphLayout(graph));

    expect(result.current.isLayoutRunning).toBe(true);
    expect(result.current.nodes).toHaveLength(0);

    runLayoutToIdle(
      () => jest.runOnlyPendingTimers(),
      () => result.current.isLayoutRunning
    );

    expect(result.current.isLayoutRunning).toBe(false);

    const centers = expectedCenters(graph);
    for (const flowNode of result.current.nodes) {
      const center = centers.get(flowNode.id);
      const size = flowNode.data.size;
      expect(flowNode.position.x).toBe((center?.x ?? 0) - size / 2);
      expect(flowNode.position.y).toBe((center?.y ?? 0) - size / 2);
    }
  });

  it('keeps the previous settled layout visible while a new one runs', () => {
    const graphA = buildStarGraph(6);
    const graphB = buildStarGraph(10);
    const { result, rerender } = renderHook(({ g }: { g: KiGraph }) => useKiGraphLayout(g), {
      initialProps: { g: graphA },
    });
    runLayoutToIdle(
      () => jest.runOnlyPendingTimers(),
      () => result.current.isLayoutRunning
    );
    const settledNodes = result.current.nodes;

    rerender({ g: graphB });

    expect(result.current.isLayoutRunning).toBe(true);
    expect(result.current.nodes).toBe(settledNodes);
  });

  it('restarts layout when the graph changes mid-run', () => {
    const graphA = buildStarGraph(6);
    const graphB = buildStarGraph(10);
    const { result, rerender } = renderHook(({ g }: { g: KiGraph }) => useKiGraphLayout(g), {
      initialProps: { g: graphA },
    });

    expect(result.current.isLayoutRunning).toBe(true);

    rerender({ g: graphB });
    expect(result.current.isLayoutRunning).toBe(true);

    runLayoutToIdle(
      () => jest.runOnlyPendingTimers(),
      () => result.current.isLayoutRunning
    );

    expect(result.current.isLayoutRunning).toBe(false);
    expect(result.current.nodes).toHaveLength(graphB.nodes.length);

    const centers = expectedCenters(graphB);
    const hub = result.current.nodes.find((n) => n.id === 'hub');
    expect(hub).toBeDefined();
    if (hub === undefined) {
      return;
    }
    const hubCenter = centers.get('hub');
    expect(hub.position.x).toBe((hubCenter?.x ?? 0) - hub.data.size / 2);
  });
});
