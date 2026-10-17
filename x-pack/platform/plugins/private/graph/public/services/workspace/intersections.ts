/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TermIntersect, WorkspaceNode } from '../../types/workspace_state';

interface IntersectionBucket {
  doc_count: number;
  targets: { buckets: Record<string, { doc_count: number }> };
}

interface IntersectionResponse {
  aggregations: {
    all: { doc_count: number };
    sources: { buckets: Record<string, IntersectionBucket> };
  };
}

interface MergeCandidate extends TermIntersect {
  mergeLeftConfidence: number;
  mergeRightConfidence: number;
  mergeConfidence: number;
}

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

const getNodeLabel = (node: WorkspaceNode): string =>
  node.numChildren > 0 ? `${node.label}(+${node.numChildren})` : node.label;

export const transformIntersectionResponse = (
  response: IntersectionResponse,
  nodes: WorkspaceNode[]
): MergeCandidate[] => {
  const allDocCount = response.aggregations.all.doc_count;
  const fullDocCounts = nodes.map(
    (_node, index) => response.aggregations.sources.buckets[`bg${index}`].doc_count
  );
  const candidates: MergeCandidate[] = [];

  nodes.forEach((rootNode, rootIndex) => {
    const rootDocCount = fullDocCounts[rootIndex];
    const targetBuckets = response.aggregations.sources.buckets[`bg${rootIndex}`].targets.buckets;
    nodes.forEach((leafNode, leafIndex) => {
      const leafDocCount = fullDocCounts[leafIndex];
      if (leafIndex === rootIndex || rootDocCount > leafDocCount) return;
      if (rootDocCount === leafDocCount && rootNode.id > leafNode.id) return;

      const overlap = targetBuckets[`fg${leafIndex}`].doc_count;
      if (overlap === 0) return;
      candidates.push({
        id1: rootNode.id,
        id2: leafNode.id,
        term1: getNodeLabel(rootNode),
        term2: getNodeLabel(leafNode),
        v1: rootDocCount,
        v2: leafDocCount,
        mergeLeftConfidence: overlap / rootDocCount,
        mergeRightConfidence: overlap / leafDocCount,
        mergeConfidence: jlhScore(overlap, leafDocCount, rootDocCount, allDocCount),
        overlap,
      });
    });
  });

  return candidates.sort((first, second) => {
    if (second.mergeConfidence !== first.mergeConfidence) {
      return second.mergeConfidence - first.mergeConfidence;
    }
    if (second.overlap !== first.overlap) return second.overlap - first.overlap;
    return first.v2 - second.v2;
  });
};
