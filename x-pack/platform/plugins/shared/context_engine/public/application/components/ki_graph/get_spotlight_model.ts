/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CREATED_BY_RELATION,
  DERIVED_FROM_RELATION,
  type KiGraph,
  type KiGraphNodeData,
  type KiGraphNodeKind,
} from './types';

export interface SpotlightNeighbor {
  node: KiGraphNodeData;
  edgeId: string;
}

export interface SpotlightGroup {
  relation: string;
  count: number;
  neighbors: readonly SpotlightNeighbor[];
  /** Neighbors hidden because the selected node is a hub and the group was capped. */
  moreCount: number;
}

export interface SpotlightModel {
  node: KiGraphNodeData;
  cameFrom: readonly SpotlightGroup[];
  incoming: readonly SpotlightGroup[];
  outgoing: readonly SpotlightGroup[];
  cameFromCount: number;
  incomingCount: number;
  outgoingCount: number;
}

export const SPOTLIGHT_HUB_NEIGHBOR_LIMIT = 8;

const isCameFromRelation = (relation: string): boolean =>
  relation === DERIVED_FROM_RELATION || relation === CREATED_BY_RELATION;

const isHubKind = (kind: KiGraphNodeKind): boolean =>
  kind === 'memory' || kind === 'workflow' || kind === 'crawler';

export const compareSpotlightNeighbors = (
  left: KiGraphNodeData,
  right: KiGraphNodeData
): number => {
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

const applyHubCap = (
  neighbors: readonly SpotlightNeighbor[],
  selectedKind: KiGraphNodeKind
): { neighbors: readonly SpotlightNeighbor[]; moreCount: number } => {
  const count = neighbors.length;
  if (!isHubKind(selectedKind) || count <= SPOTLIGHT_HUB_NEIGHBOR_LIMIT) {
    return { neighbors, moreCount: 0 };
  }
  return {
    neighbors: neighbors.slice(0, SPOTLIGHT_HUB_NEIGHBOR_LIMIT),
    moreCount: count - SPOTLIGHT_HUB_NEIGHBOR_LIMIT,
  };
};

const bucketsToGroups = (
  buckets: RelationBuckets,
  selectedKind: KiGraphNodeKind
): SpotlightGroup[] => {
  const groups: SpotlightGroup[] = [];

  for (const [relation, byNeighbor] of buckets) {
    const sorted = [...byNeighbor.values()].sort((left, right) =>
      compareSpotlightNeighbors(left.node, right.node)
    );
    const { neighbors, moreCount } = applyHubCap(sorted, selectedKind);
    groups.push({
      relation,
      count: sorted.length,
      neighbors,
      moreCount,
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

  const cameFromBuckets: RelationBuckets = new Map();
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
      const isEntityLink = selected.kind === 'entity' && neighbor.kind === 'entity';
      if (isEntityLink) {
        addNeighbor(outgoingBuckets, edge.relation, { node: neighbor, edgeId: edge.id });
        continue;
      }
      if (isCameFromRelation(edge.relation) && isHubKind(selected.kind)) {
        addNeighbor(outgoingBuckets, edge.relation, { node: neighbor, edgeId: edge.id });
        continue;
      }
      if (isCameFromRelation(edge.relation)) {
        addNeighbor(cameFromBuckets, edge.relation, { node: neighbor, edgeId: edge.id });
        continue;
      }
      addNeighbor(incomingBuckets, edge.relation, { node: neighbor, edgeId: edge.id });
    }

    if (edge.source === selectedId) {
      const neighbor = nodeById.get(edge.target);
      if (neighbor === undefined) {
        continue;
      }
      if (isCameFromRelation(edge.relation)) {
        addNeighbor(cameFromBuckets, edge.relation, { node: neighbor, edgeId: edge.id });
        continue;
      }
      addNeighbor(outgoingBuckets, edge.relation, { node: neighbor, edgeId: edge.id });
    }
  }

  return {
    node: selected,
    cameFrom: bucketsToGroups(cameFromBuckets, selected.kind),
    incoming: bucketsToGroups(incomingBuckets, selected.kind),
    outgoing: bucketsToGroups(outgoingBuckets, selected.kind),
    cameFromCount: countKeptNeighbors(cameFromBuckets),
    incomingCount: countKeptNeighbors(incomingBuckets),
    outgoingCount: countKeptNeighbors(outgoingBuckets),
  };
};
