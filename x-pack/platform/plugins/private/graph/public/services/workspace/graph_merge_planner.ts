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
