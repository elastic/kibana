/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ForceLayoutEdge, ForceLayoutNode } from './force_layout';
import { forceLayout } from './force_layout';

const GLYPH_R = 14;
const HUB_R = 22;

const buildMultiHubStarGraph = (): { nodes: ForceLayoutNode[]; edges: ForceLayoutEdge[] } => {
  const nodes: ForceLayoutNode[] = [];
  const edges: ForceLayoutEdge[] = [];

  for (let h = 0; h < 5; h++) {
    const hubId = `hub-${h}`;
    nodes.push({ id: hubId, radius: HUB_R });
    for (let l = 0; l < 11; l++) {
      const leafId = `${hubId}-leaf-${l}`;
      nodes.push({ id: leafId, radius: GLYPH_R });
      edges.push({ source: hubId, target: leafId });
    }
  }

  edges.push({ source: 'hub-0', target: 'hub-1' });
  edges.push({ source: 'hub-2', target: 'hub-3' });

  return { nodes, edges };
};

const buildSingleStar = (
  leafCount: number
): { nodes: ForceLayoutNode[]; edges: ForceLayoutEdge[] } => {
  const nodes: ForceLayoutNode[] = [{ id: 'hub', radius: HUB_R }];
  const edges: ForceLayoutEdge[] = [];
  for (let i = 0; i < leafCount; i++) {
    const leafId = `leaf-${i}`;
    nodes.push({ id: leafId, radius: GLYPH_R });
    edges.push({ source: 'hub', target: leafId });
  }
  return { nodes, edges };
};

const OVERLAP_TOLERANCE = 1;

const circlesOverlap = (
  positions: ReadonlyMap<string, { x: number; y: number }>,
  nodes: readonly ForceLayoutNode[]
): boolean => {
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const posA = positions.get(a.id);
    if (posA === undefined) {
      return true;
    }
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const posB = positions.get(b.id);
      if (posB === undefined) {
        return true;
      }
      const dist = Math.hypot(posA.x - posB.x, posA.y - posB.y);
      const minDist = a.radius + b.radius - OVERLAP_TOLERANCE;
      if (dist < minDist) {
        return true;
      }
    }
  }
  return false;
};

const allFinite = (positions: ReadonlyMap<string, { x: number; y: number }>): boolean => {
  for (const pos of positions.values()) {
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
      return false;
    }
  }
  return true;
};

const createLcg = (seed: number): (() => number) => {
  const modulus = 0x1_0000_0000;
  let state = seed % modulus;
  return () => {
    state = (1664525 * state + 1013904223) % modulus;
    return state / modulus;
  };
};

const buildRandomGraph = (
  nodeCount: number,
  seed: number
): { nodes: ForceLayoutNode[]; edges: ForceLayoutEdge[] } => {
  const rand = createLcg(seed);
  const nodes: ForceLayoutNode[] = [];
  const edges: ForceLayoutEdge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const isHub = rand() < 0.12;
    nodes.push({ id: `n-${i}`, radius: isHub ? HUB_R : GLYPH_R });
  }

  for (let i = 0; i < nodeCount; i++) {
    const hub = Math.floor(rand() * Math.min(20, nodeCount));
    edges.push({ source: `n-${hub}`, target: `n-${i}` });
    if (i > 0) {
      const other = Math.floor(rand() * i);
      edges.push({ source: `n-${other}`, target: `n-${i}` });
    }
  }

  return { nodes, edges };
};

describe('forceLayout', () => {
  it('returns empty for no nodes and places a single node finitely', () => {
    expect(forceLayout([], [])).toEqual(new Map());

    const single = forceLayout([{ id: 'only', radius: GLYPH_R }], []);
    expect(single.size).toBe(1);
    const pos = single.get('only');
    expect(pos).toBeDefined();
    expect(Number.isFinite(pos?.x)).toBe(true);
    expect(Number.isFinite(pos?.y)).toBe(true);
  });

  it('is deterministic for identical input', () => {
    const { nodes, edges } = buildMultiHubStarGraph();
    const first = forceLayout(nodes, edges);
    const second = forceLayout(nodes, edges);
    expect(second).toEqual(first);
  });

  it('ignores self loops and edges to unknown nodes', () => {
    const nodes: ForceLayoutNode[] = [
      { id: 'a', radius: GLYPH_R },
      { id: 'b', radius: GLYPH_R },
    ];
    const edges: ForceLayoutEdge[] = [
      { source: 'a', target: 'a' },
      { source: 'a', target: 'missing' },
      { source: 'a', target: 'b' },
    ];
    const positions = forceLayout(nodes, edges);
    expect(positions.size).toBe(2);
    expect(allFinite(positions)).toBe(true);
    expect(circlesOverlap(positions, nodes)).toBe(false);
  });

  it('avoids circle overlap on the multi-hub star graph', () => {
    const { nodes, edges } = buildMultiHubStarGraph();
    const positions = forceLayout(nodes, edges);

    expect(positions.size).toBe(60);
    expect(allFinite(positions)).toBe(true);
    expect(circlesOverlap(positions, nodes)).toBe(false);
  });

  it('avoids circle overlap on a 20-leaf star', () => {
    const { nodes, edges } = buildSingleStar(20);
    const positions = forceLayout(nodes, edges);

    expect(positions.size).toBe(21);
    expect(circlesOverlap(positions, nodes)).toBe(false);
  });

  it('avoids circle overlap on a 60-node random graph', () => {
    const { nodes, edges } = buildRandomGraph(60, 7);
    const positions = forceLayout(nodes, edges);

    expect(positions.size).toBe(60);
    expect(circlesOverlap(positions, nodes)).toBe(false);
  });

  it('places the hub near the centroid of its leaves', () => {
    const { nodes, edges } = buildSingleStar(18);
    const positions = forceLayout(nodes, edges);

    const hubPos = positions.get('hub');
    expect(hubPos).toBeDefined();
    if (hubPos === undefined) {
      return;
    }

    let leafCx = 0;
    let leafCy = 0;
    let leafCount = 0;
    let sumLeafToHub = 0;

    for (const node of nodes) {
      if (node.id === 'hub') {
        continue;
      }
      const pos = positions.get(node.id);
      if (pos === undefined) {
        continue;
      }
      leafCx += pos.x;
      leafCy += pos.y;
      leafCount += 1;
      sumLeafToHub += Math.hypot(pos.x - hubPos.x, pos.y - hubPos.y);
    }

    expect(leafCount).toBe(18);
    leafCx /= leafCount;
    leafCy /= leafCount;

    const hubToCentroid = Math.hypot(hubPos.x - leafCx, hubPos.y - leafCy);
    const avgLeafToHub = sumLeafToHub / leafCount;

    expect(hubToCentroid).toBeLessThan(avgLeafToHub);
  });

  it('lays out 1000 nodes within time budget with finite coordinates', () => {
    const rand = createLcg(42);
    const nodes: ForceLayoutNode[] = [];
    const edges: ForceLayoutEdge[] = [];

    for (let i = 0; i < 1000; i++) {
      nodes.push({ id: `n-${i}`, radius: GLYPH_R });
    }

    for (let i = 0; i < 1000; i++) {
      const hub = Math.floor(rand() * 20);
      edges.push({ source: `n-${hub}`, target: `n-${i}` });
      if (i > 0) {
        const other = Math.floor(rand() * i);
        edges.push({ source: `n-${other}`, target: `n-${i}` });
      }
    }

    const started = Date.now();
    const positions = forceLayout(nodes, edges);
    const elapsed = Date.now() - started;

    expect(positions.size).toBe(1000);
    expect(allFinite(positions)).toBe(true);
    expect(elapsed).toBeLessThan(3000);

    // eslint-disable-next-line no-console
    console.log(`forceLayout 1000 nodes: ${elapsed}ms`);
  });
});
