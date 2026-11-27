/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';

export interface ForceLayoutNode {
  id: string;
  radius: number;
  occurrences?: number;
}

export interface ForceLayoutEdge {
  source: string;
  target: string;
}

export interface ForcePosition {
  x: number;
  y: number;
}

export interface ForceLayoutParams {
  manyBodyStrength: number;
  manyBodyDistanceMax: number;
  manyBodyTheta: number;
  linkStrength: number;
  linkRestBase: number;
  linkRestPerDegree: number;
  gravity: number;
  collisionGap: number;
  collisionStrength: number;
  collisionIterations: number;
  velocityDecay: number;
  alphaDecay: number;
  ticks: number | 'auto';
}

export type KiGraphCenterBy = 'connections' | 'occurrences' | 'none';

export interface KiGraphCenterParams {
  centerBy: KiGraphCenterBy;
  pinCenterNode: boolean;
  radialStrength: number;
  radialSpacing: number;
}

const DEFAULT_ALPHA_DECAY = 1 - Math.pow(0.001, 1 / 300);

export const DEFAULT_FORCE_LAYOUT_PARAMS: ForceLayoutParams = {
  manyBodyStrength: -90,
  manyBodyDistanceMax: 220,
  manyBodyTheta: 0.9,
  linkStrength: 0.08,
  linkRestBase: 58,
  linkRestPerDegree: 5,
  gravity: 0.012,
  collisionGap: 6,
  collisionStrength: 1,
  collisionIterations: 2,
  velocityDecay: 0.4,
  alphaDecay: DEFAULT_ALPHA_DECAY,
  ticks: 'auto',
};

export const DEFAULT_KI_GRAPH_CENTER_PARAMS: KiGraphCenterParams = {
  centerBy: 'connections',
  pinCenterNode: false,
  radialStrength: 0,
  radialSpacing: 60,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const simulationIterations = (nodeCount: number): number =>
  clamp(300 - Math.floor(nodeCount / 4), 80, 300);

interface LayoutNode extends SimulationNodeDatum {
  id: string;
  radius: number;
  occurrences?: number;
}

interface LayoutLink extends SimulationLinkDatum<LayoutNode> {
  distance: number;
}

const edgeRestLength = (
  radiusA: number,
  radiusB: number,
  degreeA: number,
  degreeB: number,
  params: ForceLayoutParams
): number => {
  const degreeRest = params.linkRestBase + Math.min(degreeA, degreeB) * params.linkRestPerDegree;
  const clearance = radiusA + radiusB + params.collisionGap;
  return Math.max(degreeRest, clearance);
};

const compareCenterRank = (
  a: LayoutNode,
  b: LayoutNode,
  centerBy: KiGraphCenterBy,
  degreeById: ReadonlyMap<string, number>,
  originalIndex: ReadonlyMap<string, number>
): number => {
  if (centerBy === 'occurrences') {
    const occDelta = (b.occurrences ?? 0) - (a.occurrences ?? 0);
    if (occDelta !== 0) {
      return occDelta;
    }
    const degreeDelta = (degreeById.get(b.id) ?? 0) - (degreeById.get(a.id) ?? 0);
    if (degreeDelta !== 0) {
      return degreeDelta;
    }
    return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
  }
  if (centerBy === 'connections') {
    const degreeDelta = (degreeById.get(b.id) ?? 0) - (degreeById.get(a.id) ?? 0);
    if (degreeDelta !== 0) {
      return degreeDelta;
    }
    return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
  }
  return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
};

const buildRankById = (
  layoutNodes: LayoutNode[],
  centerBy: KiGraphCenterBy,
  degreeById: ReadonlyMap<string, number>,
  originalIndex: ReadonlyMap<string, number>
): ReadonlyMap<string, number> => {
  if (centerBy === 'none') {
    const rankById = new Map<string, number>();
    for (const node of layoutNodes) {
      rankById.set(node.id, 0);
    }
    return rankById;
  }
  const sorted = [...layoutNodes].sort((a, b) =>
    compareCenterRank(a, b, centerBy, degreeById, originalIndex)
  );
  const rankById = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    rankById.set(sorted[i].id, i);
  }
  return rankById;
};

const buildLayout = (
  nodes: readonly ForceLayoutNode[],
  edges: readonly ForceLayoutEdge[],
  params: ForceLayoutParams,
  centerParams: KiGraphCenterParams
): {
  layoutNodes: LayoutNode[];
  layoutLinks: LayoutLink[];
  rankById: ReadonlyMap<string, number>;
} => {
  const radiusById = new Map<string, number>();
  const degreeById = new Map<string, number>();
  const originalIndex = new Map<string, number>();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    radiusById.set(node.id, node.radius);
    degreeById.set(node.id, 0);
    originalIndex.set(node.id, i);
  }

  const edgeKeys = new Set<string>();
  const dedupedEdges: Array<{ source: string; target: string }> = [];

  for (const edge of edges) {
    if (edge.source === edge.target) {
      continue;
    }
    if (!radiusById.has(edge.source) || !radiusById.has(edge.target)) {
      continue;
    }
    const lo = edge.source < edge.target ? edge.source : edge.target;
    const hi = edge.source < edge.target ? edge.target : edge.source;
    const key = `${lo}\0${hi}`;
    if (edgeKeys.has(key)) {
      continue;
    }
    edgeKeys.add(key);
    dedupedEdges.push({ source: edge.source, target: edge.target });
    degreeById.set(edge.source, (degreeById.get(edge.source) ?? 0) + 1);
    degreeById.set(edge.target, (degreeById.get(edge.target) ?? 0) + 1);
  }

  const layoutLinks: LayoutLink[] = dedupedEdges.map((edge) => {
    const radiusSource = radiusById.get(edge.source) ?? 0;
    const radiusTarget = radiusById.get(edge.target) ?? 0;
    const degreeSource = degreeById.get(edge.source) ?? 0;
    const degreeTarget = degreeById.get(edge.target) ?? 0;
    return {
      source: edge.source,
      target: edge.target,
      distance: edgeRestLength(radiusSource, radiusTarget, degreeSource, degreeTarget, params),
    };
  });

  const mappedNodes: LayoutNode[] = nodes.map((node) => ({
    id: node.id,
    radius: node.radius,
    ...(node.occurrences !== undefined ? { occurrences: node.occurrences } : {}),
  }));

  let layoutNodes: LayoutNode[];
  if (centerParams.centerBy === 'none') {
    layoutNodes = mappedNodes;
  } else {
    layoutNodes = [...mappedNodes].sort((a, b) =>
      compareCenterRank(a, b, centerParams.centerBy, degreeById, originalIndex)
    );
  }

  const rankById = buildRankById(layoutNodes, centerParams.centerBy, degreeById, originalIndex);

  return { layoutNodes, layoutLinks, rankById };
};

const resolveTickCount = (nodeCount: number, ticks: number | 'auto'): number => {
  if (ticks === 'auto') {
    return simulationIterations(nodeCount);
  }
  return ticks;
};

const topRankedNodeId = (rankById: ReadonlyMap<string, number>): string | undefined => {
  let bestId: string | undefined;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const [id, rank] of rankById) {
    if (rank < bestRank) {
      bestRank = rank;
      bestId = id;
    }
  }
  return bestId;
};

const runSimulation = (
  layoutNodes: LayoutNode[],
  layoutLinks: LayoutLink[],
  params: ForceLayoutParams,
  centerParams: KiGraphCenterParams,
  rankById: ReadonlyMap<string, number>
): LayoutNode[] => {
  const iterations = resolveTickCount(layoutNodes.length, params.ticks);

  const linkForce = forceLink<LayoutNode, LayoutLink>(layoutLinks)
    .id((node) => node.id)
    .distance((link) => link.distance)
    .strength(params.linkStrength);

  const simulation = forceSimulation(layoutNodes)
    .velocityDecay(params.velocityDecay)
    .alphaDecay(params.alphaDecay)
    .force(
      'charge',
      forceManyBody<LayoutNode>()
        .strength(params.manyBodyStrength)
        .distanceMax(params.manyBodyDistanceMax)
        .theta(params.manyBodyTheta)
    )
    .force('link', linkForce)
    .force('x', forceX<LayoutNode>(0).strength(params.gravity))
    .force('y', forceY<LayoutNode>(0).strength(params.gravity))
    .force(
      'collide',
      forceCollide<LayoutNode>((node) => node.radius + params.collisionGap)
        .strength(params.collisionStrength)
        .iterations(params.collisionIterations)
    );

  if (centerParams.radialStrength > 0) {
    simulation.force(
      'radial',
      forceRadial<LayoutNode>(
        (node) => centerParams.radialSpacing * Math.sqrt(rankById.get(node.id) ?? 0),
        0,
        0
      ).strength(centerParams.radialStrength)
    );
  }

  if (centerParams.pinCenterNode && centerParams.centerBy !== 'none') {
    const centerId = topRankedNodeId(rankById);
    if (centerId !== undefined) {
      const pinned = layoutNodes.find((node) => node.id === centerId);
      if (pinned !== undefined) {
        pinned.fx = 0;
        pinned.fy = 0;
      }
    }
  }

  simulation.stop();
  simulation.tick(iterations);

  return layoutNodes;
};

export const forceLayout = (
  nodes: readonly ForceLayoutNode[],
  edges: readonly ForceLayoutEdge[],
  params: ForceLayoutParams = DEFAULT_FORCE_LAYOUT_PARAMS,
  centerParams: KiGraphCenterParams = DEFAULT_KI_GRAPH_CENTER_PARAMS
): ReadonlyMap<string, ForcePosition> => {
  if (nodes.length === 0) {
    return new Map();
  }

  const { layoutNodes, layoutLinks, rankById } = buildLayout(nodes, edges, params, centerParams);
  const settled = runSimulation(layoutNodes, layoutLinks, params, centerParams, rankById);

  const result = new Map<string, ForcePosition>();
  for (const node of settled) {
    result.set(node.id, {
      x: Math.round(node.x ?? 0),
      y: Math.round(node.y ?? 0),
    });
  }
  return result;
};
