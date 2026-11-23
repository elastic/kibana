/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ForceLayoutEdge, ForceLayoutNode } from './force_layout';
import { forceLayout } from './force_layout';

const NODE_W = 200;
const NODE_H = 56;

const buildStarGraph = (): { nodes: ForceLayoutNode[]; edges: ForceLayoutEdge[] } => {
  const nodes: ForceLayoutNode[] = [];
  const edges: ForceLayoutEdge[] = [];

  for (let h = 0; h < 5; h++) {
    const hubId = `hub-${h}`;
    nodes.push({ id: hubId, width: NODE_W, height: NODE_H });
    for (let l = 0; l < 11; l++) {
      const leafId = `${hubId}-leaf-${l}`;
      nodes.push({ id: leafId, width: NODE_W, height: NODE_H });
      edges.push({ source: hubId, target: leafId });
    }
  }

  edges.push({ source: 'hub-0', target: 'hub-1' });
  edges.push({ source: 'hub-2', target: 'hub-3' });

  return { nodes, edges };
};

const boxesOverlap = (
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
      const overlapX =
        posA.x < posB.x + b.width &&
        posA.x + a.width > posB.x &&
        posA.y < posB.y + b.height &&
        posA.y + a.height > posB.y;
      if (overlapX) {
        return true;
      }
    }
  }
  return false;
};

const layoutExtents = (
  positions: ReadonlyMap<string, { x: number; y: number }>,
  nodes: readonly ForceLayoutNode[]
): { width: number; height: number } => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const pos = positions.get(node.id);
    if (pos === undefined) {
      continue;
    }
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + node.width);
    maxY = Math.max(maxY, pos.y + node.height);
  }

  return { width: maxX - minX, height: maxY - minY };
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

describe('forceLayout', () => {
  it('returns empty for no nodes and places a single node finitely', () => {
    expect(forceLayout([], [])).toEqual(new Map());

    const single = forceLayout([{ id: 'only', width: NODE_W, height: NODE_H }], []);
    expect(single.size).toBe(1);
    const pos = single.get('only');
    expect(pos).toBeDefined();
    expect(Number.isFinite(pos?.x)).toBe(true);
    expect(Number.isFinite(pos?.y)).toBe(true);
  });

  it('is deterministic for identical input', () => {
    const { nodes, edges } = buildStarGraph();
    const first = forceLayout(nodes, edges);
    const second = forceLayout(nodes, edges);
    expect(second).toEqual(first);
  });

  it('avoids overlap and forms a wide blob for the star graph', () => {
    const { nodes, edges } = buildStarGraph();
    const positions = forceLayout(nodes, edges);

    expect(positions.size).toBe(60);
    expect(allFinite(positions)).toBe(true);
    expect(boxesOverlap(positions, nodes)).toBe(false);

    const { width, height } = layoutExtents(positions, nodes);
    expect(width).toBeGreaterThan(height);
  });

  it('lays out 1000 nodes within time budget with finite coordinates', () => {
    const rand = createLcg(42);
    const nodes: ForceLayoutNode[] = [];
    const edges: ForceLayoutEdge[] = [];

    for (let i = 0; i < 1000; i++) {
      nodes.push({ id: `n-${i}`, width: NODE_W, height: NODE_H });
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
