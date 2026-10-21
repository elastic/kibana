/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceEdge, WorkspaceNode } from '../../types/workspace_state';

export const isTopLevelNode = ({ parent }: WorkspaceNode): boolean => parent == null;

export const unpackGroupedNodes = (
  topLevelNodes: WorkspaceNode[],
  edges: WorkspaceEdge[]
): WorkspaceNode[] => {
  const result = [...topLevelNodes];

  edges.forEach((edge) => {
    if (result.includes(edge.topTarget)) {
      let target = edge.target;
      while (target.parent) {
        if (!result.includes(target)) result.push(target);
        target = target.parent;
      }
    }

    if (result.includes(edge.topSrc)) {
      let source = edge.source;
      while (source.parent) {
        if (!result.includes(source)) result.push(source);
        source = source.parent;
      }
    }
  });

  return result;
};
