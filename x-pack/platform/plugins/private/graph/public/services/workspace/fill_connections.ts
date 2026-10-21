/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphData, WorkspaceNode } from '../../types/workspace_state';
import { makeEdgeId } from './graph_merge_planner';

interface MatrixBucket {
  key: string;
  doc_count: number;
}

interface MatrixResponse {
  hits: { total: { value: number } };
  aggregations: { matrix: { buckets: MatrixBucket[] } };
}

export const limitNodesForConnectionSearch = (
  nodes: WorkspaceNode[],
  random: () => number = Math.random
): WorkspaceNode[] => {
  const selectedNodes = [...nodes];
  const maxNumVerticesSearchable = 100;
  if (selectedNodes.length <= maxNumVerticesSearchable) return selectedNodes;

  for (let index = 0; index < maxNumVerticesSearchable; index++) {
    const randomIndex = Math.floor(random() * (selectedNodes.length - index)) + index;
    [selectedNodes[index], selectedNodes[randomIndex]] = [
      selectedNodes[randomIndex],
      selectedNodes[index],
    ];
  }
  return selectedNodes.slice(0, maxNumVerticesSearchable - 1);
};

const jlhScore = (
  subsetFrequency: number,
  subsetSize: number,
  supersetFrequency: number,
  supersetSize: number
): number => {
  const subsetProbability = subsetFrequency / subsetSize;
  const supersetProbability = supersetFrequency / supersetSize;
  const absoluteProbabilityChange = subsetProbability - supersetProbability;
  if (absoluteProbabilityChange <= 0) return 0;
  return absoluteProbabilityChange * (subsetProbability / supersetProbability);
};

export const transformFillConnectionsResponse = ({
  response,
  nodes,
  existingEdgeIds,
  useSignificance,
  minDocCount,
  maxNewEdges,
}: {
  response: MatrixResponse;
  nodes: WorkspaceNode[];
  existingEdgeIds: ReadonlySet<string>;
  useSignificance: boolean;
  minDocCount: number;
  maxNewEdges: number;
}): { graph: GraphData; existingEdgeDocCounts: Record<string, number> } => {
  const bucketsByKey = Object.fromEntries(
    response.aggregations.matrix.buckets.map((bucket) => [bucket.key, bucket])
  );
  const weightedBuckets = response.aggregations.matrix.buckets.map((bucket) => {
    const ids = bucket.key.split('|');
    if (ids.length !== 2) return { ...bucket, weight: 0 };
    const weight = useSignificance
      ? jlhScore(
          bucket.doc_count,
          Math.max(bucketsByKey[ids[0]].doc_count, bucketsByKey[ids[1]].doc_count),
          Math.min(bucketsByKey[ids[0]].doc_count, bucketsByKey[ids[1]].doc_count),
          response.hits.total.value
        )
      : bucket.doc_count;
    return { ...bucket, weight };
  });
  const maxEdgeWeight = weightedBuckets.reduce(
    (maximum, bucket) => Math.max(maximum, bucket.weight),
    0
  );
  const existingEdgeDocCounts: Record<string, number> = {};
  const edges = weightedBuckets.flatMap((bucket) => {
    const ids = bucket.key.split('|');
    if (ids.length !== 2 || bucket.doc_count < minDocCount) return [];
    const source = Number.parseInt(ids[0], 10);
    const target = Number.parseInt(ids[1], 10);
    const edgeId = makeEdgeId(nodes[source].id, nodes[target].id);
    if (existingEdgeIds.has(edgeId)) {
      existingEdgeDocCounts[edgeId] = bucket.doc_count;
      return [];
    }
    return [
      {
        source,
        target,
        weight: bucket.weight,
        width: Math.max(2, (bucket.weight / maxEdgeWeight) * 5),
        doc_count: bucket.doc_count,
      },
    ];
  });

  return {
    graph: {
      nodes: nodes.map((node) => ({
        field: node.data.field,
        term: node.data.term,
      })),
      edges: edges.sort((a, b) => b.weight - a.weight).slice(0, maxNewEdges),
    },
    existingEdgeDocCounts,
  };
};
