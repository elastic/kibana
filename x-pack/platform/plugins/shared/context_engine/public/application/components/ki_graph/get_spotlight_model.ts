/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiGraph, KiGraphNodeData } from './types';

export interface SpotlightNeighbor {
  node: KiGraphNodeData;
  edgeId: string;
}

export interface SpotlightGroup {
  relation: string;
  count: number;
  neighbors: readonly SpotlightNeighbor[];
}

export interface SpotlightModel {
  node: KiGraphNodeData;
  incoming: readonly SpotlightGroup[];
  outgoing: readonly SpotlightGroup[];
  incomingCount: number;
  outgoingCount: number;
}

const compareNeighbors = (left: KiGraphNodeData, right: KiGraphNodeData): number => {
  const leftOccurrences = left.occurrences;
  const rightOccurrences = right.occurrences;

  if (leftOccurrences !== undefined && rightOccurrences !== undefined) {
    if (leftOccurrences !== rightOccurrences) {
      return rightOccurrences - leftOccurrences;
    }
  } else if (leftOccurrences !== undefined) {
    return -1;
  } else if (rightOccurrences !== undefined) {
    return 1;
  }

  return left.title.localeCompare(right.title);
};

const compareGroups = (left: SpotlightGroup, right: SpotlightGroup): number => {
  if (left.count !== right.count) {
    return right.count - left.count;
  }
  return left.relation.localeCompare(right.relation);
};

type RelationBuckets = Map<string, Map<string, SpotlightNeighbor>>;

const addNeighbor = (
  buckets: RelationBuckets,
  relation: string,
  neighbor: SpotlightNeighbor
): void => {
  let byNeighbor = buckets.get(relation);
  if (byNeighbor === undefined) {
    byNeighbor = new Map();
    buckets.set(relation, byNeighbor);
  }
  if (byNeighbor.has(neighbor.node.kiId)) {
    return;
  }
  byNeighbor.set(neighbor.node.kiId, neighbor);
};

const bucketsToGroups = (buckets: RelationBuckets): SpotlightGroup[] => {
  const groups: SpotlightGroup[] = [];

  for (const [relation, byNeighbor] of buckets) {
    const neighbors = [...byNeighbor.values()].sort((left, right) =>
      compareNeighbors(left.node, right.node)
    );
    groups.push({
      relation,
      count: neighbors.length,
      neighbors,
    });
  }

  groups.sort(compareGroups);
  return groups;
};

const countKeptNeighbors = (buckets: RelationBuckets): number => {
  let total = 0;
  for (const byNeighbor of buckets.values()) {
    total += byNeighbor.size;
  }
  return total;
};

export const getSpotlightModel = (
  graph: KiGraph,
  selectedId: string
): SpotlightModel | undefined => {
  const nodeById = new Map<string, KiGraphNodeData>();
  for (const node of graph.nodes) {
    nodeById.set(node.kiId, node);
  }

  const selected = nodeById.get(selectedId);
  if (selected === undefined) {
    return undefined;
  }

  const incomingBuckets: RelationBuckets = new Map();
  const outgoingBuckets: RelationBuckets = new Map();

  for (const edge of graph.edges) {
    if (edge.source === edge.target) {
      continue;
    }

    if (edge.target === selectedId) {
      const neighbor = nodeById.get(edge.source);
      if (neighbor === undefined) {
        continue;
      }
      // Links between two entities have no meaningful direction, so they always go on the right.
      const isEntityLink = selected.kind === 'entity' && neighbor.kind === 'entity';
      const buckets = isEntityLink ? outgoingBuckets : incomingBuckets;
      addNeighbor(buckets, edge.relation, { node: neighbor, edgeId: edge.id });
    }

    if (edge.source === selectedId) {
      const neighbor = nodeById.get(edge.target);
      if (neighbor === undefined) {
        continue;
      }
      addNeighbor(outgoingBuckets, edge.relation, { node: neighbor, edgeId: edge.id });
    }
  }

  return {
    node: selected,
    incoming: bucketsToGroups(incomingBuckets),
    outgoing: bucketsToGroups(outgoingBuckets),
    incomingCount: countKeptNeighbors(incomingBuckets),
    outgoingCount: countKeptNeighbors(outgoingBuckets),
  };
};
