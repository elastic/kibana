/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface IncomingNode {
  field: string;
  term: string;
  id?: string;
  label?: string;
  [key: string]: unknown;
}

interface NormalizedIncomingNode extends IncomingNode {
  id: string;
  label: string;
}

export const makeNodeId = (field: string, term: string): string => `${field}..${term}`;

export const makeEdgeId = (sourceId: string, targetId: string): string =>
  sourceId > targetId ? `${targetId}->${sourceId}` : `${sourceId}->${targetId}`;

interface IncomingEdge {
  source: number;
  target: number;
  weight: number;
  width: number;
  doc_count: number;
  label?: string;
}

interface ExistingEdge {
  weight: number;
  doc_count: number;
}

export type EdgeMergeOperation =
  | {
      type: 'add';
      id: string;
      sourceId: string;
      targetId: string;
      edge: IncomingEdge;
    }
  | {
      type: 'update';
      id: string;
      weight: number;
      docCount: number;
    };

export const planIncomingEdges = ({
  edges,
  nodes,
  existingEdges,
}: {
  edges: IncomingEdge[];
  nodes: NormalizedIncomingNode[];
  existingEdges: Readonly<Record<string, ExistingEdge>>;
}): EdgeMergeOperation[] => {
  const currentEdges = new Map(Object.entries(existingEdges));

  return edges.map((edge) => {
    const sourceId = nodes[edge.source].id;
    const targetId = nodes[edge.target].id;
    const id = makeEdgeId(sourceId, targetId);
    const existingEdge = currentEdges.get(id);
    if (existingEdge) {
      const updatedEdge = {
        weight: Math.max(existingEdge.weight, edge.weight),
        doc_count: Math.max(existingEdge.doc_count, edge.doc_count),
      };
      currentEdges.set(id, updatedEdge);
      return {
        type: 'update' as const,
        id,
        weight: updatedEdge.weight,
        docCount: updatedEdge.doc_count,
      };
    }

    currentEdges.set(id, edge);
    return { type: 'add' as const, id, sourceId, targetId, edge };
  });
};

export const prepareIncomingNodes = (
  nodes: IncomingNode[],
  existingNodeIds: ReadonlySet<string>
): { normalizedNodes: NormalizedIncomingNode[]; newNodes: NormalizedIncomingNode[] } => {
  const normalizedNodes: NormalizedIncomingNode[] = nodes.map((node) => ({
    ...node,
    id: makeNodeId(node.field, node.term),
    label: node.label || node.term,
  }));

  return {
    normalizedNodes,
    newNodes: normalizedNodes.filter(({ id }) => !existingNodeIds.has(id)),
  };
};
