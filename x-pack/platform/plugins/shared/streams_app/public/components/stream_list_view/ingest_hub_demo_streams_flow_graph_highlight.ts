/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlowGraphEdgeDef, FlowGraphPoint } from './ingest_hub_demo_streams_flow_graph_model';

export interface FlowHighlightSets {
  readonly nodeIds: ReadonlySet<string>;
  readonly edgeIds: ReadonlySet<string>;
  /**
   * When true, the hovered edge ends at a branch with multiple outgoing edges. The highlight is
   * the union of root→leaf paths for each child (e.g. shared trunk into a fan). The canvas draws
   * those edges individually in the strong color instead of a single merged SVG path.
   */
  readonly multicastBranch?: boolean;
}

function buildIncomingEdgeByTo(
  edges: readonly FlowGraphEdgeDef[]
): ReadonlyMap<string, FlowGraphEdgeDef> {
  const m = new Map<string, FlowGraphEdgeDef>();
  for (const e of edges) {
    m.set(e.to, e);
  }
  return m;
}

/** Edges on the unique path from the tree root down to `nodeId` (inclusive of the last edge into `nodeId`). */
function pathEdgesToNode(
  nodeId: string,
  incomingByTo: ReadonlyMap<string, FlowGraphEdgeDef>
): FlowGraphEdgeDef[] {
  const reversed: FlowGraphEdgeDef[] = [];
  let cur = nodeId;
  while (true) {
    const e = incomingByTo.get(cur);
    if (!e) {
      break;
    }
    reversed.push(e);
    cur = e.from;
  }
  return reversed.reverse();
}

function nodesOnPathToNode(
  nodeId: string,
  incomingByTo: ReadonlyMap<string, FlowGraphEdgeDef>
): Set<string> {
  const nodes = new Set<string>();
  let cur = nodeId;
  while (true) {
    nodes.add(cur);
    const e = incomingByTo.get(cur);
    if (!e) {
      break;
    }
    cur = e.from;
  }
  return nodes;
}

/**
 * When hovering an edge, highlight the unique route from the graph root down to that edge's
 * target node (`to`), inclusive. If `to` is a branch with multiple outgoing edges, highlight the
 * union of every root→leaf path through each child (shared trunk + all downstream destinations).
 */
export function computeFlowHighlightForHoveredEdge(
  edges: readonly FlowGraphEdgeDef[],
  hoveredEdgeId: string | null
): FlowHighlightSets | null {
  if (!hoveredEdgeId) {
    return null;
  }
  const hovered = edges.find((e) => e.id === hoveredEdgeId);
  if (!hovered) {
    return null;
  }
  const incomingByTo = buildIncomingEdgeByTo(edges);

  const outgoingFromTarget = edges.filter((e) => e.from === hovered.to);
  if (outgoingFromTarget.length > 1) {
    const edgeIds = new Set<string>();
    const nodeIds = new Set<string>();
    for (const down of outgoingFromTarget) {
      for (const e of pathEdgesToNode(down.to, incomingByTo)) {
        edgeIds.add(e.id);
      }
      for (const n of nodesOnPathToNode(down.to, incomingByTo)) {
        nodeIds.add(n);
      }
    }
    return { nodeIds, edgeIds, multicastBranch: true };
  }

  const pathEdgeList = pathEdgesToNode(hovered.to, incomingByTo);
  const edgeIds = new Set(pathEdgeList.map((e) => e.id));
  const nodeIds = nodesOnPathToNode(hovered.to, incomingByTo);

  return { nodeIds, edgeIds };
}

const MERGE_POLYLINE_POINT_EPS = 0.75;

/**
 * Ordered edges root → `targetNodeId`, merged into one waypoint polyline (dedupes repeated
 * points at edge joins). Used to draw a single dashed stroke for the full hovered trace so dots
 * do not stack at hubs.
 */
export function mergeWaypointPolylineForPathToNode(
  edges: readonly FlowGraphEdgeDef[],
  targetNodeId: string
): FlowGraphPoint[] {
  const incomingByTo = buildIncomingEdgeByTo(edges);
  const path = pathEdgesToNode(targetNodeId, incomingByTo);
  const out: FlowGraphPoint[] = [];
  for (const e of path) {
    for (const pt of e.polyline) {
      const last = out[out.length - 1];
      if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < MERGE_POLYLINE_POINT_EPS) {
        continue;
      }
      out.push({ x: pt.x, y: pt.y });
    }
  }
  return out;
}

/** Full trace waypoints for the hovered edge’s downstream path (same scope as {@link computeFlowHighlightForHoveredEdge}). */
export function mergeWaypointPolylineForHoveredEdge(
  edges: readonly FlowGraphEdgeDef[],
  hoveredEdgeId: string | null
): FlowGraphPoint[] | null {
  if (!hoveredEdgeId) {
    return null;
  }
  const hovered = edges.find((e) => e.id === hoveredEdgeId);
  if (!hovered) {
    return null;
  }
  return mergeWaypointPolylineForPathToNode(edges, hovered.to);
}

export function polylineLength(
  polyline: ReadonlyArray<{ readonly x: number; readonly y: number }>
) {
  let sum = 0;
  for (let i = 1; i < polyline.length; i++) {
    const a = polyline[i - 1];
    const b = polyline[i];
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}

export function pointAlongPolyline(
  polyline: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  t: number
): { x: number; y: number } {
  if (polyline.length === 0) {
    return { x: 0, y: 0 };
  }
  if (polyline.length === 1) {
    return { x: polyline[0].x, y: polyline[0].y };
  }
  const clampedT = Math.min(1, Math.max(0, t));
  const total = polylineLength(polyline);
  if (total === 0) {
    return { x: polyline[0].x, y: polyline[0].y };
  }
  let remaining = total * clampedT;
  for (let i = 1; i < polyline.length; i++) {
    const a = polyline[i - 1];
    const b = polyline[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= seg) {
      const r = seg === 0 ? 0 : remaining / seg;
      return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r };
    }
    remaining -= seg;
  }
  const last = polyline[polyline.length - 1];
  return { x: last.x, y: last.y };
}

export function polylineToPathD(
  polyline: ReadonlyArray<{ readonly x: number; readonly y: number }>
) {
  if (polyline.length === 0) {
    return '';
  }
  const [first, ...rest] = polyline;
  return `M ${first.x} ${first.y}` + rest.map((p) => ` L ${p.x} ${p.y}`).join('');
}

const DEFAULT_CONNECTOR_CORNER_RADIUS = 26;

/**
 * Orthogonal polyline with rounded corners (quadratic fillets), matching a soft “elbow” flow.
 */
export function polylineToRoundedElbowPathD(
  polyline: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  cornerRadius: number = DEFAULT_CONNECTOR_CORNER_RADIUS
): string {
  if (polyline.length < 2) {
    return '';
  }
  if (polyline.length === 2) {
    const [a, b] = polyline;
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }
  const p = polyline.map((pt) => ({ x: pt.x, y: pt.y }));
  const r = Math.max(0, cornerRadius);
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 1; i <= p.length - 2; i++) {
    const prev = p[i - 1];
    const curr = p[i];
    const next = p[i + 1];
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const l1 = Math.hypot(v1x, v1y);
    const l2 = Math.hypot(v2x, v2y);
    if (l1 < 1e-6 || l2 < 1e-6) {
      continue;
    }
    const cross = v1x * v2y - v1y * v2x;
    const dot = v1x * v2x + v1y * v2y;
    if (Math.abs(cross) < 1e-4 && dot > 0) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }
    const rr = Math.min(r, l1 * 0.48, l2 * 0.48);
    const s1x = curr.x - (v1x / l1) * rr;
    const s1y = curr.y - (v1y / l1) * rr;
    const s2x = curr.x + (v2x / l2) * rr;
    const s2y = curr.y + (v2y / l2) * rr;
    d += ` L ${s1x} ${s1y} Q ${curr.x} ${curr.y} ${s2x} ${s2y}`;
  }
  const last = p[p.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** Connector path: straight two-point edges; rounded elbows for orthogonal polylines (3+ points). */
export function polylineToSmoothPathD(
  polyline: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  cornerRadius: number = DEFAULT_CONNECTOR_CORNER_RADIUS
): string {
  if (polyline.length < 2) {
    return '';
  }
  if (polyline.length === 2) {
    const [a, b] = polyline;
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }
  return polylineToRoundedElbowPathD(polyline, cornerRadius);
}

/** Approximate point along connector geometry (linear for 2-point; polyline length for elbows). */
export function pointAlongSmoothEdge(
  polyline: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  t: number
): { x: number; y: number } {
  if (polyline.length === 0) {
    return { x: 0, y: 0 };
  }
  if (polyline.length === 1) {
    return { x: polyline[0].x, y: polyline[0].y };
  }
  if (polyline.length === 2) {
    const [a, b] = polyline;
    const clampedT = Math.min(1, Math.max(0, t));
    return {
      x: a.x + (b.x - a.x) * clampedT,
      y: a.y + (b.y - a.y) * clampedT,
    };
  }
  return pointAlongPolyline(polyline, t);
}
