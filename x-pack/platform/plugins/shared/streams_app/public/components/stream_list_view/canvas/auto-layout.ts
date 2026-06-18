/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The "Cleanup" auto-layout algorithm.

import type { Edge, Node, XYPosition } from '@xyflow/react';
import { GRID_SIZE } from './constants';

const measuredHeight = (n: Node) => n.measured?.height ?? (n.height as number | undefined) ?? 0;

// Straightens connectors. Links join nodes at their vertical centers, so a link
// is only straight when both endpoints share a center Y. This pass walks the
// graph left-to-right and, for every 1:1 link (the source has exactly one
// outgoing edge AND the target exactly one incoming edge), sets the target's
// center equal to the source's — so chains render as perfectly straight
// horizontal lines. Branch/merge nodes are left where they are (snapped to the
// grid). Returns id → new position (only Y changes). Nodes whose size hasn't
// been measured yet are skipped so we never align against a bogus height.
export function straightenChains(nodes: Node[], edges: Edge[]): Map<string, XYPosition> {
  const layoutNodes = nodes.filter((n) => n.type !== 'routingEndpoint' && measuredHeight(n) > 0);
  const ids = new Set(layoutNodes.map((n) => n.id));
  const outCount = new Map<string, number>(layoutNodes.map((n) => [n.id, 0]));
  const inCount = new Map<string, number>(layoutNodes.map((n) => [n.id, 0]));
  const inSource = new Map<string, string>();
  edges.forEach((e) => {
    if (!ids.has(e.source) || !ids.has(e.target)) return;
    outCount.set(e.source, (outCount.get(e.source) ?? 0) + 1);
    inCount.set(e.target, (inCount.get(e.target) ?? 0) + 1);
    inSource.set(e.target, e.source);
  });

  const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
  const center = new Map<string, number>();
  // Process left-to-right so a chain's parent is resolved before its child.
  const ordered = [...layoutNodes].sort((a, b) => a.position.x - b.position.x);
  for (const n of ordered) {
    const src = inSource.get(n.id);
    if (inCount.get(n.id) === 1 && src && outCount.get(src) === 1 && center.has(src)) {
      // 1:1 link → inherit the source's (already grid-aligned) center exactly.
      center.set(n.id, center.get(src)!);
    } else {
      center.set(n.id, snap(n.position.y + measuredHeight(n) / 2));
    }
  }

  const pos = new Map<string, XYPosition>();
  layoutNodes.forEach((n) => {
    pos.set(n.id, { x: n.position.x, y: center.get(n.id)! - measuredHeight(n) / 2 });
  });
  return pos;
}

// "Cleanup" auto-layout. Goals: (1) align everything to tidy left-to-right
// columns by flow depth, (2) keep each independent flow (connected component)
// in its own horizontal band so unrelated flows never interleave, and
// (3) minimise edge crossings within a flow by ordering each column with a
// barycenter heuristic. Returns id → new grid-snapped position.
const CLEANUP_COLUMN_GAP = 320;
const CLEANUP_ROW_GAP = 160;
const CLEANUP_COMPONENT_GAP = 96;
export function computeCleanupLayout(nodes: Node[], edges: Edge[]): Map<string, XYPosition> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const valid = (e: Edge) => byId.has(e.source) && byId.has(e.target);

  // Directed adjacency (for layering) + undirected adjacency (for components).
  const outs = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  const ins = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  const indeg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const undirected = new Map<string, Set<string>>(nodes.map((n) => [n.id, new Set()]));
  edges.forEach((e) => {
    if (!valid(e)) return;
    outs.get(e.source)!.push(e.target);
    ins.get(e.target)!.push(e.source);
    indeg.set(e.target, indeg.get(e.target)! + 1);
    undirected.get(e.source)!.add(e.target);
    undirected.get(e.target)!.add(e.source);
  });

  // Partition into connected components (independent flows).
  const componentOf = new Map<string, number>();
  let componentCount = 0;
  for (const node of nodes) {
    if (componentOf.has(node.id)) continue;
    const stack = [node.id];
    componentOf.set(node.id, componentCount);
    while (stack.length) {
      const id = stack.pop()!;
      for (const nb of undirected.get(id)!) {
        if (!componentOf.has(nb)) {
          componentOf.set(nb, componentCount);
          stack.push(nb);
        }
      }
    }
    componentCount += 1;
  }
  const components = new Map<number, Node[]>();
  nodes.forEach((n) => {
    const k = componentOf.get(n.id)!;
    if (!components.has(k)) components.set(k, []);
    components.get(k)!.push(n);
  });

  const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;
  const median = (xs: number[]) =>
    xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : -1;
  const pos = new Map<string, XYPosition>();

  // Lay out components top-to-bottom, ordered by their original vertical
  // position so the result stays close to the user's mental model.
  const orderedComponents = [...components.values()].sort(
    (a, b) => Math.min(...a.map((n) => n.position.y)) - Math.min(...b.map((n) => n.position.y))
  );

  let yCursor = 0;
  for (const group of orderedComponents) {
    const ids = new Set(group.map((n) => n.id));

    // Longest-path layering within the component.
    const layer = new Map<string, number>();
    const work = new Map([...indeg].filter(([id]) => ids.has(id)));
    const q = group.filter((n) => (work.get(n.id) ?? 0) === 0).map((n) => n.id);
    q.forEach((id) => layer.set(id, 0));
    const queue = [...q];
    while (queue.length) {
      const id = queue.shift()!;
      const l = layer.get(id) ?? 0;
      for (const t of outs.get(id)!) {
        if (!ids.has(t)) continue;
        layer.set(t, Math.max(layer.get(t) ?? 0, l + 1));
        work.set(t, (work.get(t) ?? 0) - 1);
        if ((work.get(t) ?? 0) === 0) queue.push(t);
      }
    }
    group.forEach((n) => {
      if (!layer.has(n.id)) layer.set(n.id, 0);
    });

    const columns = new Map<number, Node[]>();
    group.forEach((n) => {
      const l = layer.get(n.id)!;
      if (!columns.has(l)) columns.set(l, []);
      columns.get(l)!.push(n);
    });
    const columnKeys = [...columns.keys()].sort((a, b) => a - b);
    columns.forEach((arr) => arr.sort((a, b) => a.position.y - b.position.y));

    const order = new Map<string, number>();
    const reindex = () => columns.forEach((arr) => arr.forEach((n, i) => order.set(n.id, i)));
    reindex();

    // Barycenter sweeps (down then up, repeated) to reduce edge crossings: each
    // node gravitates to the median row of its neighbours in the adjacent column.
    for (let sweep = 0; sweep < 4; sweep++) {
      const goingDown = sweep % 2 === 0;
      const keys = goingDown ? columnKeys.slice(1) : [...columnKeys].slice(0, -1).reverse();
      for (const k of keys) {
        const arr = columns.get(k)!;
        const bary = new Map<string, number>();
        arr.forEach((n) => {
          const neighbours = (goingDown ? ins.get(n.id)! : outs.get(n.id)!)
            .filter((id) => ids.has(id))
            .map((id) => order.get(id)!)
            .filter((i) => i !== undefined);
          bary.set(n.id, neighbours.length ? median(neighbours) : order.get(n.id)!);
        });
        arr.sort(
          (a, b) => bary.get(a.id)! - bary.get(b.id)! || order.get(a.id)! - order.get(b.id)!
        );
        reindex();
      }
    }

    // Position: each component's columns start at x=0 (so all flows share the
    // same column grid) and are vertically centered within the band.
    const maxRows = Math.max(...columnKeys.map((k) => columns.get(k)!.length));
    const bandHeight = (maxRows - 1) * CLEANUP_ROW_GAP;
    columnKeys.forEach((k) => {
      const arr = columns.get(k)!;
      const colOffset = (bandHeight - (arr.length - 1) * CLEANUP_ROW_GAP) / 2;
      arr.forEach((n, i) => {
        pos.set(n.id, {
          x: snap(k * CLEANUP_COLUMN_GAP),
          y: snap(yCursor + colOffset + i * CLEANUP_ROW_GAP),
        });
      });
    });
    yCursor += bandHeight + CLEANUP_ROW_GAP + CLEANUP_COMPONENT_GAP;
  }
  return pos;
}
