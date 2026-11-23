/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ForceLayoutNode {
  id: string;
  radius: number;
}

export interface ForceLayoutEdge {
  source: string;
  target: string;
}

export interface ForcePosition {
  x: number;
  y: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const REPULSE_STRENGTH = 2400;
const REPULSE_MAX_DIST = 220;
const MIN_DIST = 4;
const SPRING_STRENGTH = 0.08;
const REST_BASE = 58;
const REST_PER_DEGREE = 5;
const GRAVITY = 0.012;
const DAMPING = 0.85;
const ALPHA_START = 1;
const ALPHA_MIN = 0.002;
const COLLISION_GAP = 6;
const COLLISION_ITERATIONS = 50;
const GRID_BUCKET_THRESHOLD = 400;
const GRID_CELL_SIZE = REPULSE_MAX_DIST;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const simulationIterations = (nodeCount: number): number =>
  clamp(300 - Math.floor(nodeCount / 4), 80, 300);

const edgeRestLength = (
  radiusA: number,
  radiusB: number,
  degreeA: number,
  degreeB: number
): number => {
  const degreeRest = REST_BASE + Math.min(degreeA, degreeB) * REST_PER_DEGREE;
  const clearance = radiusA + radiusB + COLLISION_GAP;
  return Math.max(degreeRest, clearance);
};

const cellKey = (cellX: number, cellY: number): string => `${cellX},${cellY}`;

interface IndexedGraph {
  readonly ids: readonly string[];
  readonly indexById: ReadonlyMap<string, number>;
  readonly radii: Float64Array;
  readonly edges: ReadonlyArray<{ readonly source: number; readonly target: number }>;
  readonly degrees: Uint32Array;
}

const buildGraph = (
  nodes: readonly ForceLayoutNode[],
  edges: readonly ForceLayoutEdge[]
): IndexedGraph => {
  const indexById = new Map<string, number>();
  const ids: string[] = [];
  const radii = new Float64Array(nodes.length);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    indexById.set(node.id, i);
    ids.push(node.id);
    radii[i] = node.radius;
  }

  const degrees = new Uint32Array(nodes.length);
  const edgeKeys = new Set<string>();
  const indexedEdges: Array<{ source: number; target: number }> = [];

  for (const edge of edges) {
    if (edge.source === edge.target) {
      continue;
    }
    const source = indexById.get(edge.source);
    const target = indexById.get(edge.target);
    if (source === undefined || target === undefined) {
      continue;
    }
    const lo = source < target ? source : target;
    const hi = source < target ? target : source;
    const key = `${lo}\0${hi}`;
    if (edgeKeys.has(key)) {
      continue;
    }
    edgeKeys.add(key);
    indexedEdges.push({ source, target });
    degrees[source] += 1;
    degrees[target] += 1;
  }

  return { ids, indexById, radii, edges: indexedEdges, degrees };
};

const seedPositions = (
  count: number,
  degrees: Uint32Array,
  radii: Float64Array,
  cx: Float64Array,
  cy: Float64Array
): void => {
  const order: number[] = [];
  for (let i = 0; i < count; i++) {
    order.push(i);
  }
  order.sort((a, b) => {
    const d = degrees[b] - degrees[a];
    if (d !== 0) {
      return d;
    }
    return a - b;
  });

  let radiusSum = 0;
  for (let i = 0; i < count; i++) {
    radiusSum += radii[i];
  }
  const avgRadius = count > 0 ? radiusSum / count : 20;
  const radialScale = Math.sqrt(count) * avgRadius * 0.22;

  for (let rank = 0; rank < count; rank++) {
    const idx = order[rank];
    const radius = radialScale * Math.sqrt(rank + 1);
    const theta = rank * GOLDEN_ANGLE;
    cx[idx] = radius * Math.cos(theta);
    cy[idx] = radius * Math.sin(theta);
  }
};

const applyPairwiseRepulsion = (
  count: number,
  cx: Float64Array,
  cy: Float64Array,
  fx: Float64Array,
  fy: Float64Array,
  alpha: number
): void => {
  for (let i = 0; i < count; i++) {
    const xi = cx[i];
    const yi = cy[i];
    for (let j = i + 1; j < count; j++) {
      const dx = xi - cx[j];
      const dy = yi - cy[j];
      const dist = Math.max(MIN_DIST, Math.hypot(dx, dy));
      if (dist > REPULSE_MAX_DIST) {
        continue;
      }
      const capped = Math.min(dist, REPULSE_MAX_DIST);
      const force = (REPULSE_STRENGTH * alpha) / (capped * capped);
      const nx = dx / dist;
      const ny = dy / dist;
      const fxVal = nx * force;
      const fyVal = ny * force;
      fx[i] += fxVal;
      fy[i] += fyVal;
      fx[j] -= fxVal;
      fy[j] -= fyVal;
    }
  }
};

const applyGridRepulsion = (
  count: number,
  cx: Float64Array,
  cy: Float64Array,
  fx: Float64Array,
  fy: Float64Array,
  alpha: number
): void => {
  const buckets = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    const cellX = Math.floor(cx[i] / GRID_CELL_SIZE);
    const cellY = Math.floor(cy[i] / GRID_CELL_SIZE);
    const key = cellKey(cellX, cellY);
    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(i);
  }

  for (let i = 0; i < count; i++) {
    const xi = cx[i];
    const yi = cy[i];
    const baseX = Math.floor(xi / GRID_CELL_SIZE);
    const baseY = Math.floor(yi / GRID_CELL_SIZE);

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const bucket = buckets.get(cellKey(baseX + ox, baseY + oy));
        if (bucket === undefined) {
          continue;
        }
        for (const j of bucket) {
          if (j <= i) {
            continue;
          }
          const dx = xi - cx[j];
          const dy = yi - cy[j];
          const dist = Math.max(MIN_DIST, Math.hypot(dx, dy));
          if (dist > REPULSE_MAX_DIST) {
            continue;
          }
          const capped = Math.min(dist, REPULSE_MAX_DIST);
          const force = (REPULSE_STRENGTH * alpha) / (capped * capped);
          const nx = dx / dist;
          const ny = dy / dist;
          const fxVal = nx * force;
          const fyVal = ny * force;
          fx[i] += fxVal;
          fy[i] += fyVal;
          fx[j] -= fxVal;
          fy[j] -= fyVal;
        }
      }
    }
  }
};

const runSimulation = (graph: IndexedGraph): { cx: Float64Array; cy: Float64Array } => {
  const count = graph.ids.length;
  const cx = new Float64Array(count);
  const cy = new Float64Array(count);
  const vx = new Float64Array(count);
  const vy = new Float64Array(count);
  const fx = new Float64Array(count);
  const fy = new Float64Array(count);

  seedPositions(count, graph.degrees, graph.radii, cx, cy);

  const iterations = simulationIterations(count);
  let alpha = ALPHA_START;

  for (let step = 0; step < iterations; step++) {
    fx.fill(0);
    fy.fill(0);

    for (let i = 0; i < count; i++) {
      fx[i] -= GRAVITY * cx[i];
      fy[i] -= GRAVITY * cy[i];
    }

    for (const edge of graph.edges) {
      const { source, target } = edge;
      const dx = cx[target] - cx[source];
      const dy = cy[target] - cy[source];
      const dist = Math.max(MIN_DIST, Math.hypot(dx, dy));
      const desired = edgeRestLength(
        graph.radii[source],
        graph.radii[target],
        graph.degrees[source],
        graph.degrees[target]
      );
      const displacement = dist - desired;
      const force = (SPRING_STRENGTH * displacement * alpha) / dist;
      const nx = dx / dist;
      const ny = dy / dist;
      const fxVal = nx * force;
      const fyVal = ny * force;
      fx[source] += fxVal;
      fy[source] += fyVal;
      fx[target] -= fxVal;
      fy[target] -= fyVal;
    }

    if (count > GRID_BUCKET_THRESHOLD) {
      applyGridRepulsion(count, cx, cy, fx, fy, alpha);
    } else {
      applyPairwiseRepulsion(count, cx, cy, fx, fy, alpha);
    }

    for (let i = 0; i < count; i++) {
      vx[i] = (vx[i] + fx[i]) * DAMPING;
      vy[i] = (vy[i] + fy[i]) * DAMPING;
      cx[i] += vx[i];
      cy[i] += vy[i];
    }

    alpha *= 1 - 1 / iterations;
    if (alpha < ALPHA_MIN) {
      alpha = ALPHA_MIN;
    }
  }

  return { cx, cy };
};

const separateCircularPair = (
  i: number,
  j: number,
  cx: Float64Array,
  cy: Float64Array,
  radii: Float64Array
): boolean => {
  const dx = cx[j] - cx[i];
  const dy = cy[j] - cy[i];
  const dist = Math.hypot(dx, dy);
  const minDist = radii[i] + radii[j] + COLLISION_GAP;

  if (dist >= minDist) {
    return false;
  }

  const effectiveDist = dist === 0 ? MIN_DIST : dist;
  const push = (minDist - dist) / 2;

  if (dist === 0) {
    const nudge = (i % 2 === 0 ? 1 : -1) * push;
    cx[i] -= nudge;
    cx[j] += nudge;
    return true;
  }

  const nx = dx / effectiveDist;
  const ny = dy / effectiveDist;
  cx[i] -= nx * push;
  cy[i] -= ny * push;
  cx[j] += nx * push;
  cy[j] += ny * push;
  return true;
};

const removeCircleOverlaps = (
  count: number,
  cx: Float64Array,
  cy: Float64Array,
  radii: Float64Array
): void => {
  if (count <= GRID_BUCKET_THRESHOLD) {
    for (let pass = 0; pass < COLLISION_ITERATIONS; pass++) {
      let moved = false;
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          if (separateCircularPair(i, j, cx, cy, radii)) {
            moved = true;
          }
        }
      }
      if (!moved) {
        break;
      }
    }
    return;
  }

  for (let pass = 0; pass < COLLISION_ITERATIONS; pass++) {
    let maxRadius = 1;
    for (let k = 0; k < count; k++) {
      if (radii[k] > maxRadius) {
        maxRadius = radii[k];
      }
    }
    const cell = 2 * maxRadius + COLLISION_GAP;

    const buckets = new Map<string, number[]>();
    for (let i = 0; i < count; i++) {
      const cellX = Math.floor(cx[i] / cell);
      const cellY = Math.floor(cy[i] / cell);
      const key = cellKey(cellX, cellY);
      let bucket = buckets.get(key);
      if (bucket === undefined) {
        bucket = [];
        buckets.set(key, bucket);
      }
      bucket.push(i);
    }

    let moved = false;
    for (let i = 0; i < count; i++) {
      const baseX = Math.floor(cx[i] / cell);
      const baseY = Math.floor(cy[i] / cell);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const bucket = buckets.get(cellKey(baseX + ox, baseY + oy));
          if (bucket === undefined) {
            continue;
          }
          for (const j of bucket) {
            if (j <= i) {
              continue;
            }
            if (separateCircularPair(i, j, cx, cy, radii)) {
              moved = true;
            }
          }
        }
      }
    }
    if (!moved) {
      break;
    }
  }
};

const toCenterPositions = (
  graph: IndexedGraph,
  cx: Float64Array,
  cy: Float64Array
): Map<string, ForcePosition> => {
  const result = new Map<string, ForcePosition>();
  for (let i = 0; i < graph.ids.length; i++) {
    result.set(graph.ids[i], {
      x: Math.round(cx[i]),
      y: Math.round(cy[i]),
    });
  }
  return result;
};

export const forceLayout = (
  nodes: readonly ForceLayoutNode[],
  edges: readonly ForceLayoutEdge[]
): ReadonlyMap<string, ForcePosition> => {
  if (nodes.length === 0) {
    return new Map();
  }

  const graph = buildGraph(nodes, edges);
  const { cx, cy } = runSimulation(graph);
  removeCircleOverlaps(graph.ids.length, cx, cy, graph.radii);
  return toCenterPositions(graph, cx, cy);
};
