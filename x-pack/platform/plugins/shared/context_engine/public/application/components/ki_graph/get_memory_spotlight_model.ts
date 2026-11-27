/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpotlightGroup, SpotlightNeighbor } from './get_spotlight_model';
import { compareSpotlightNeighbors } from './get_spotlight_model';
import type { KiGraphSource } from './ki_graph_source';
import type { KiGraph, KiGraphNodeData } from './types';

const DERIVED_FROM_RELATION = 'derived_from';

export interface MemorySpotlightModel {
  source: KiGraphSource;
  group: SpotlightGroup;
}

const memoryEdgeId = (memoryId: string, nodeId: string): string => `memory:${memoryId}:${nodeId}`;

export const getMemoryDerivedNodes = (
  graph: KiGraph,
  memoryId: string
): readonly KiGraphNodeData[] => {
  const neighbors: KiGraphNodeData[] = [];
  for (const node of graph.nodes) {
    const derivedFromIds = node.derivedFromIds;
    if (derivedFromIds === undefined) {
      continue;
    }
    if (derivedFromIds.includes(memoryId)) {
      neighbors.push(node);
    }
  }
  neighbors.sort(compareSpotlightNeighbors);
  return neighbors;
};

export const getMemorySpotlightModel = (
  graph: KiGraph,
  memoryId: string,
  source: KiGraphSource
): MemorySpotlightModel => {
  const derivedNodes = getMemoryDerivedNodes(graph, memoryId);
  const spotlightNeighbors: SpotlightNeighbor[] = derivedNodes.map((node) => ({
    node,
    edgeId: memoryEdgeId(memoryId, node.kiId),
  }));

  return {
    source,
    group: {
      relation: DERIVED_FROM_RELATION,
      count: spotlightNeighbors.length,
      neighbors: spotlightNeighbors,
    },
  };
};
