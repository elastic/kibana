/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ForceLayoutNode {
  id: string;
  width: number;
  height: number;
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
const REPULSE_STRENGTH = 22_000;
const REPULSE_MAX_DIST = 420;
const MIN_DIST = 4;
const SPRING_STRENGTH = 0.08;
const REST_LENGTH_FACTOR = 1.5;
const GRAVITY_X = 0.01;
const GRAVITY_Y = 0.02;
const BLOB_X_SCALE = 1.34;
const BLOB_Y_SCALE = 0.74;
const DAMPING = 0.85;
const ALPHA_START = 1;
const ALPHA_MIN = 0.002;
const OVERLAP_ITERATIONS = 50;
const ROUNDED_OVERLAP_ITERATIONS = 120;
const OVERLAP_GAP = 16;
const GRID_BUCKET_THRESHOLD = 400;
const GRID_CELL_SIZE = REPULSE_MAX_DIST;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const simulationIterations = (nodeCount: number): number =>
  clamp(300 - Math.floor(nodeCount / 4), 80, 300);

const diagonal = (width: number, height: number): number => Math.hypot(width, height);

const restLength = (widthA: number, heightA: number, widthB: number, heightB: number): number => {
  const diagRest =
    ((diagonal(widthA, heightA) + diagonal(widthB, heightB)) / 2) * REST_LENGTH_FACTOR;
  const clearance = Math.max(
    (widthA + widthB) / 2 + OVERLAP_GAP,
    (heightA + heightB) / 2 + OVERLAP_GAP
  );
  return Math.max(diagRest, clearance * 1.8);
};

const cellKey = (cellX: number, cellY: number): string => `${cellX},${cellY}`;

interface IndexedGraph {
  readonly ids: readonly string[];
  readonly indexById: ReadonlyMap<string, number>;
  readonly widths: Float64Array;
  readonly heights: Float64Array;
  readonly edges: ReadonlyArray<{ readonly source: number; readonly target: number }>;
  readonly degrees: Uint32Array;
}

const buildGraph = (
  nodes: readonly ForceLayoutNode[],
  edges: readonly ForceLayoutEdge[]
): IndexedGraph => {
  const indexById = new Map<string, number>();
  const ids: string[] = [];
  const widths = new Float64Array(nodes.length);
  const heights = new Float64Array(nodes.length);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    indexById.set(node.id, i);
    ids.push(node.id);
    widths[i] = node.width;
    heights[i] = node.height;
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

  return { ids, indexById, widths, heights, edges: indexedEdges, degrees };
};

const seedPositions = (
  count: number,
  degrees: Uint32Array,
  widths: Float64Array,
  heights: Float64Array,
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

  let sizeSum = 0;
  for (let i = 0; i < count; i++) {
    sizeSum += (widths[i] + heights[i]) / 2;
  }
  const avgSize = count > 0 ? sizeSum / count : 200;
  const radialScale = Math.sqrt(count) * avgSize * 0.22;

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

  seedPositions(count, graph.degrees, graph.widths, graph.heights, cx, cy);

  const iterations = simulationIterations(count);
  let alpha = ALPHA_START;

  for (let step = 0; step < iterations; step++) {
    fx.fill(0);
    fy.fill(0);

    for (let i = 0; i < count; i++) {
      fx[i] -= GRAVITY_X * cx[i];
      fy[i] -= GRAVITY_Y * cy[i];
    }

    for (const edge of graph.edges) {
      const { source, target } = edge;
      const dx = cx[target] - cx[source];
      const dy = cy[target] - cy[source];
      const dist = Math.max(MIN_DIST, Math.hypot(dx, dy));
      const desired = restLength(
        graph.widths[source],
        graph.heights[source],
        graph.widths[target],
        graph.heights[target]
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

const separateOverlappingPair = (
  i: number,
  j: number,
  cx: Float64Array,
  cy: Float64Array,
  widths: Float64Array,
  heights: Float64Array
): boolean => {
  const dx = cx[j] - cx[i];
  const dy = cy[j] - cy[i];
  const halfGapX = (widths[i] + widths[j]) / 2 + OVERLAP_GAP;
  const halfGapY = (heights[i] + heights[j]) / 2 + OVERLAP_GAP;
  const overlapX = halfGapX - Math.abs(dx);
  const overlapY = halfGapY - Math.abs(dy);

  if (overlapX <= 0 || overlapY <= 0) {
    return false;
  }

  if (dx === 0 && dy === 0) {
    const nudge = (i % 2 === 0 ? 1 : -1) * (overlapX / 2);
    cx[i] -= nudge;
    cx[j] += nudge;
    return true;
  }

  if (overlapX < overlapY) {
    const push = (overlapX / 2) * (dx >= 0 ? 1 : -1);
    cx[i] -= push;
    cx[j] += push;
  } else {
    const push = (overlapY / 2) * (dy >= 0 ? 1 : -1);
    cy[i] -= push;
    cy[j] += push;
  }
  return true;
};

const removeBoxOverlaps = (
  count: number,
  cx: Float64Array,
  cy: Float64Array,
  widths: Float64Array,
  heights: Float64Array
): void => {
  if (count <= GRID_BUCKET_THRESHOLD) {
    for (let pass = 0; pass < OVERLAP_ITERATIONS; pass++) {
      let moved = false;
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          if (separateOverlappingPair(i, j, cx, cy, widths, heights)) {
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

  for (let pass = 0; pass < OVERLAP_ITERATIONS; pass++) {
    const buckets = new Map<string, number[]>();
    let maxDim = 1;
    for (let k = 0; k < count; k++) {
      if (widths[k] > maxDim) {
        maxDim = widths[k];
      }
      if (heights[k] > maxDim) {
        maxDim = heights[k];
      }
    }
    const cell = maxDim + OVERLAP_GAP;

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
            if (separateOverlappingPair(i, j, cx, cy, widths, heights)) {
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

const separateRoundedPair = (
  i: number,
  j: number,
  tx: Int32Array,
  ty: Int32Array,
  widths: Float64Array,
  heights: Float64Array
): boolean => {
  const ax = tx[i];
  const ay = ty[i];
  const bx = tx[j];
  const by = ty[j];
  const aw = widths[i];
  const ah = heights[i];
  const bw = widths[j];
  const bh = heights[j];
  const overlapX = Math.min(ax + aw, bx + bw) - Math.max(ax, bx);
  const overlapY = Math.min(ay + ah, by + bh) - Math.max(ay, by);

  if (overlapX <= 0 || overlapY <= 0) {
    return false;
  }

  if (overlapX <= overlapY) {
    const push = Math.ceil(overlapX / 2);
    if (ax <= bx) {
      tx[i] -= push;
      tx[j] += push;
    } else {
      tx[i] += push;
      tx[j] -= push;
    }
  } else {
    const push = Math.ceil(overlapY / 2);
    if (ay <= by) {
      ty[i] -= push;
      ty[j] += push;
    } else {
      ty[i] += push;
      ty[j] -= push;
    }
  }
  return true;
};

const removeRoundedOverlaps = (
  count: number,
  tx: Int32Array,
  ty: Int32Array,
  widths: Float64Array,
  heights: Float64Array
): void => {
  for (let pass = 0; pass < ROUNDED_OVERLAP_ITERATIONS; pass++) {
    let moved = false;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (separateRoundedPair(i, j, tx, ty, widths, heights)) {
          moved = true;
        }
      }
    }
    if (!moved) {
      break;
    }
  }
};

const applyBlobScaling = (cx: Float64Array, cy: Float64Array): void => {
  for (let i = 0; i < cx.length; i++) {
    cx[i] *= BLOB_X_SCALE;
    cy[i] *= BLOB_Y_SCALE;
  }
};

const toTopLeftPositions = (
  graph: IndexedGraph,
  cx: Float64Array,
  cy: Float64Array
): Map<string, ForcePosition> => {
  const count = graph.ids.length;
  const tx = new Int32Array(count);
  const ty = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    const halfW = graph.widths[i] / 2;
    const halfH = graph.heights[i] / 2;
    tx[i] = Math.round(cx[i] - halfW);
    ty[i] = Math.round(cy[i] - halfH);
  }

  if (count <= GRID_BUCKET_THRESHOLD) {
    removeRoundedOverlaps(count, tx, ty, graph.widths, graph.heights);
  }

  const result = new Map<string, ForcePosition>();
  for (let i = 0; i < count; i++) {
    result.set(graph.ids[i], { x: tx[i], y: ty[i] });
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
  applyBlobScaling(cx, cy);
  removeBoxOverlaps(graph.ids.length, cx, cy, graph.widths, graph.heights);
  applyBlobScaling(cx, cy);
  removeBoxOverlaps(graph.ids.length, cx, cy, graph.widths, graph.heights);
  return toTopLeftPositions(graph, cx, cy);
};
