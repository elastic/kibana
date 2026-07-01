/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// "Bridge" (line-hop) geometry. Our connectors are orthogonal, so a crossing is
// always one edge's HORIZONTAL segment over another's VERTICAL segment; the
// horizontal one draws a small arc there so the links read as not-connected.
//
// Crucially, the segments are PUBLISHED by each edge from its own exact render
// coordinates (sourceX/sourceY/targetX/targetY/midX) into a shared registry —
// rather than re-derived from node positions, which drifts by several pixels and
// misaligns the arcs. Hops are then computed from those exact segments.

export interface EdgeSegments {
  h: Array<{ y: number; x1: number; x2: number }>;
  v: Array<{ x: number; y1: number; y2: number }>;
}

export type EdgeHops = Map<string, Array<{ x: number; y: number }>>;

// The exact H/V segments of one orthogonal connector.
export function segmentsForEdge(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  midX: number
): EdgeSegments {
  if (Math.abs(sy - ty) < 0.5) {
    return { h: [{ y: sy, x1: Math.min(sx, tx), x2: Math.max(sx, tx) }], v: [] };
  }
  return {
    h: [
      { y: sy, x1: Math.min(sx, midX), x2: Math.max(sx, midX) },
      { y: ty, x1: Math.min(midX, tx), x2: Math.max(midX, tx) },
    ],
    v: [{ x: midX, y1: Math.min(sy, ty), y2: Math.max(sy, ty) }],
  };
}

export function segmentsEqual(a: EdgeSegments, b: EdgeSegments): boolean {
  if (a.h.length !== b.h.length || a.v.length !== b.v.length) return false;
  for (let i = 0; i < a.h.length; i++) {
    if (a.h[i].y !== b.h[i].y || a.h[i].x1 !== b.h[i].x1 || a.h[i].x2 !== b.h[i].x2) return false;
  }
  for (let i = 0; i < a.v.length; i++) {
    if (a.v[i].x !== b.v[i].x || a.v[i].y1 !== b.v[i].y1 || a.v[i].y2 !== b.v[i].y2) return false;
  }
  return true;
}

// From the registry of every edge's exact segments, find where each edge's
// horizontal run crosses a foreign vertical run and record a hop there.
export function computeHopsFromSegments(registry: Map<string, EdgeSegments>): EdgeHops {
  const hsegs: Array<{ id: string; y: number; x1: number; x2: number }> = [];
  const vsegs: Array<{ id: string; x: number; y1: number; y2: number }> = [];
  for (const [id, seg] of registry) {
    for (const h of seg.h) hsegs.push({ id, ...h });
    for (const v of seg.v) vsegs.push({ id, ...v });
  }
  const EPS = 2;
  const hops: EdgeHops = new Map();
  for (const h of hsegs) {
    for (const v of vsegs) {
      if (v.id === h.id) continue;
      if (v.x > h.x1 + EPS && v.x < h.x2 - EPS && h.y > v.y1 + EPS && h.y < v.y2 - EPS) {
        if (!hops.has(h.id)) hops.set(h.id, []);
        hops.get(h.id)!.push({ x: v.x, y: h.y });
      }
    }
  }
  return hops;
}
