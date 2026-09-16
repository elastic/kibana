/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionEdgeView, DecisionNodeView, DecisionTreeView } from './types';

/** Fields of a node that can change between versions, used to label a modification. */
export type DecisionNodeField = 'node_type' | 'label' | 'node_metadata';

export interface DecisionNodeChange {
  node_id: string;
  before: DecisionNodeView;
  after: DecisionNodeView;
  changed_fields: DecisionNodeField[];
}

export interface DecisionEdgeChange {
  before: DecisionEdgeView;
  after: DecisionEdgeView;
}

export interface DecisionTreeDiff {
  nodes_added: DecisionNodeView[];
  nodes_removed: DecisionNodeView[];
  nodes_modified: DecisionNodeChange[];
  edges_added: DecisionEdgeView[];
  edges_removed: DecisionEdgeView[];
  edges_modified: DecisionEdgeChange[];
}

/**
 * Edge identity is its source, target and condition, so an edge whose only change is whether it
 * was taken reads as a modification rather than an add plus a remove. That is what lets the diff
 * surface a newly-causal branch instead of a churn of unrelated edges.
 */
const edgeKey = (edge: DecisionEdgeView): string =>
  `${edge.source_node_id}\u0000${edge.target_node_id}\u0000${edge.condition}`;

const nodeMetadataEqual = (
  before: DecisionNodeView['node_metadata'],
  after: DecisionNodeView['node_metadata']
): boolean => (before?.description ?? '') === (after?.description ?? '');

const nodeChangedFields = (
  before: DecisionNodeView,
  after: DecisionNodeView
): DecisionNodeField[] => {
  const changed: DecisionNodeField[] = [];
  if (before.node_type !== after.node_type) {
    changed.push('node_type');
  }
  if (before.label !== after.label) {
    changed.push('label');
  }
  if (!nodeMetadataEqual(before.node_metadata, after.node_metadata)) {
    changed.push('node_metadata');
  }
  return changed;
};

/**
 * Compares two parsed decision trees and returns the nodes and edges that were added, removed or
 * modified. Nodes are matched by `node_id`, edges by source/target/condition; an edge that only
 * flipped `is_taken` is reported as modified.
 */
export const diffDecisionTrees = (
  before: DecisionTreeView,
  after: DecisionTreeView
): DecisionTreeDiff => {
  const beforeNodes = new Map(before.nodes.map((node) => [node.node_id, node]));
  const afterNodes = new Map(after.nodes.map((node) => [node.node_id, node]));

  const nodes_added: DecisionNodeView[] = [];
  const nodes_removed: DecisionNodeView[] = [];
  const nodes_modified: DecisionNodeChange[] = [];

  for (const [nodeId, afterNode] of afterNodes) {
    const beforeNode = beforeNodes.get(nodeId);
    if (!beforeNode) {
      nodes_added.push(afterNode);
      continue;
    }
    const changedFields = nodeChangedFields(beforeNode, afterNode);
    if (changedFields.length > 0) {
      nodes_modified.push({
        node_id: nodeId,
        before: beforeNode,
        after: afterNode,
        changed_fields: changedFields,
      });
    }
  }

  for (const [nodeId, beforeNode] of beforeNodes) {
    if (!afterNodes.has(nodeId)) {
      nodes_removed.push(beforeNode);
    }
  }

  const beforeEdges = new Map(before.edges.map((edge) => [edgeKey(edge), edge]));
  const afterEdges = new Map(after.edges.map((edge) => [edgeKey(edge), edge]));

  const edges_added: DecisionEdgeView[] = [];
  const edges_removed: DecisionEdgeView[] = [];
  const edges_modified: DecisionEdgeChange[] = [];

  for (const [key, afterEdge] of afterEdges) {
    const beforeEdge = beforeEdges.get(key);
    if (!beforeEdge) {
      edges_added.push(afterEdge);
      continue;
    }
    if (beforeEdge.is_taken !== afterEdge.is_taken) {
      edges_modified.push({ before: beforeEdge, after: afterEdge });
    }
  }

  for (const [key, beforeEdge] of beforeEdges) {
    if (!afterEdges.has(key)) {
      edges_removed.push(beforeEdge);
    }
  }

  return {
    nodes_added,
    nodes_removed,
    nodes_modified,
    edges_added,
    edges_removed,
    edges_modified,
  };
};
