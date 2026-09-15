/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, InternalNode, Node } from '@xyflow/react';
import type { Hop, Point, IndexedEdges } from './types';

/**
 * Build the orthogonal (Z-shaped) polyline between a source and target point.
 * The wire runs horizontally to a vertical "branch" column, down/up, then to the target.
 */
export function buildPolyline(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  branchX?: number
): Point[] {
  const midX = branchX ?? (sourceX + targetX) / 2;
  return [
    { x: sourceX, y: sourceY },
    { x: midX, y: sourceY },
    { x: midX, y: targetY },
    { x: targetX, y: targetY },
  ];
}

/**
 * Turn a polyline + the hops that cross it into an SVG path string, drawing a
 * small arc (bridge) at each hop so crossing wires appear to overlap cleanly.
 */
export function polylineToPath(points: Point[], hops: Hop[], hopRadius: number): string {
  let draw = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const horizontal = a.y === b.y;
    const segHops = hops.filter((h) => h.segIndex === i).sort((h1, h2) => h1.at - h2.at);

    if (segHops.length === 0) {
      draw += ` L ${b.x} ${b.y}`;
      continue;
    }

    if (horizontal) {
      const dir = b.x > a.x ? 1 : -1;
      for (const h of segHops) {
        const cx = a.x + dir * h.at;
        const before = cx - dir * hopRadius;
        const after = cx + dir * hopRadius;
        draw += ` L ${before} ${a.y}`;
        // arc bumps "up" (negative y) regardless of dir
        const sweep = dir === 1 ? 1 : 0;
        draw += ` A ${hopRadius} ${hopRadius} 0 0 ${sweep} ${after} ${a.y}`;
      }
      draw += ` L ${b.x} ${b.y}`;
    } else {
      const dir = b.y > a.y ? 1 : -1;
      for (const h of segHops) {
        const cy = a.y + dir * h.at;
        const before = cy - dir * hopRadius;
        const after = cy + dir * hopRadius;
        draw += ` L ${a.x} ${before}`;
        const sweep = dir === 1 ? 0 : 1;
        draw += ` A ${hopRadius} ${hopRadius} 0 0 ${sweep} ${a.x} ${after}`;
      }
      draw += ` L ${b.x} ${b.y}`;
    }
  }
  return draw;
}

/** Resolve the absolute canvas position of a node handle (or a sensible fallback). */
export function getHandlePos(
  nodeLookup: Map<string, InternalNode<Node>>,
  nodeId: string,
  handleId: string | null | undefined,
  type: 'source' | 'target'
): Point | null {
  const node = nodeLookup.get(nodeId);
  if (!node) return null;
  const abs = node.internals?.positionAbsolute ?? node.position;
  const hbs = node.internals?.handleBounds?.[type] ?? [];
  let hb = handleId ? hbs.find((h) => h.id === handleId) : null;
  if (!hb) hb = hbs[0];
  if (hb) {
    return { x: abs.x + hb.x + hb.width / 2, y: abs.y + hb.y + hb.height / 2 };
  }
  const w = node.measured?.width ?? 150;
  const h = node.measured?.height ?? 40;
  if (type === 'source') return { x: abs.x + w, y: abs.y + h / 2 };
  return { x: abs.x, y: abs.y + h / 2 };
}

/**
 * Compute the vertical "branch" column X for an edge, fanning siblings that leave
 * the same source handle so they don't perfectly overlap.
 */
export function branchColumnXOn(
  edge: Edge,
  allEdges: Edge[],
  sx: number,
  tx: number,
  fanStart: number,
  fanStep: number
): number {
  const siblings = allEdges
    .filter(
      (e) => e.source === edge.source && (e.sourceHandle ?? null) === (edge.sourceHandle ?? null)
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const idx = siblings.findIndex((e) => e.id === edge.id);
  const fallback = (sx + tx) / 2;
  if (siblings.length <= 1 || idx < 0) return fallback;
  const branch = sx + fanStart + idx * fanStep;
  if (tx > sx) return Math.min(branch, tx - 10);
  return Math.max(branch, tx + 10);
}

/**
 * Detect where "my" polyline crosses other polylines and return the hops this
 * edge should draw. Only crossings with edges rendered underneath (lower array
 * index) produce a hop, so the wire on top always shows the bridge.
 */
export function computeHops(
  me: Point[],
  meIdx: number,
  othersData: IndexedEdges[],
  epsilon: number
): Hop[] {
  const EPS = epsilon;
  const hops: Hop[] = [];

  for (let i = 0; i < me.length - 1; i++) {
    const a = me[i];
    const b = me[i + 1];
    const myH = Math.abs(a.y - b.y) < EPS;
    const myV = Math.abs(a.x - b.x) < EPS;
    if (!myH && !myV) continue;

    for (const { idx: oIdx, poly: op } of othersData) {
      // Rule: only the edge that renders ON TOP (later in array) draws the hop.
      // This guarantees the bump is visible above the wire underneath.
      if (oIdx > meIdx) continue;

      for (let j = 0; j < op.length - 1; j++) {
        const oa = op[j];
        const ob = op[j + 1];
        const oH = Math.abs(oa.y - ob.y) < EPS;
        const oV = Math.abs(oa.x - ob.x) < EPS;

        if (myH && oV) {
          const xMin = Math.min(a.x, b.x);
          const xMax = Math.max(a.x, b.x);
          const yMin = Math.min(oa.y, ob.y);
          const yMax = Math.max(oa.y, ob.y);
          if (oa.x > xMin + EPS && oa.x < xMax - EPS && a.y > yMin + EPS && a.y < yMax - EPS) {
            const dir = b.x > a.x ? 1 : -1;
            hops.push({ segIndex: i, at: dir * (oa.x - a.x), side: 1 });
          }
        } else if (myV && oH) {
          const yMin = Math.min(a.y, b.y);
          const yMax = Math.max(a.y, b.y);
          const xMin = Math.min(oa.x, ob.x);
          const xMax = Math.max(oa.x, ob.x);
          if (oa.y > yMin + EPS && oa.y < yMax - EPS && a.x > xMin + EPS && a.x < xMax - EPS) {
            const dir = b.y > a.y ? 1 : -1;
            hops.push({ segIndex: i, at: dir * (oa.y - a.y), side: 1 });
          }
        }
      }
    }
  }

  return hops;
}
