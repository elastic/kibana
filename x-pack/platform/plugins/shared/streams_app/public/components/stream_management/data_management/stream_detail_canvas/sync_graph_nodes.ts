/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { ClassicCanvasNode } from './types';

export const getGraphNodeIds = (graphNodes: Array<{ id: string }>): string =>
  graphNodes.map((node) => node.id).join('\0');

const getComparableData = (data: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => typeof value !== 'function'));

const hasNodeMetadataChanged = (current: ClassicCanvasNode, incoming: ClassicCanvasNode): boolean =>
  current.type !== incoming.type ||
  current.ariaLabel !== incoming.ariaLabel ||
  !isEqual(getComparableData(current.data), getComparableData(incoming.data));

export const syncCanvasNodeMetadata = (
  current: ClassicCanvasNode[],
  next: ClassicCanvasNode[]
): ClassicCanvasNode[] => {
  const nextById = new Map(next.map((node) => [node.id, node]));
  let didChange = false;

  const synced = current.map((node) => {
    const incoming = nextById.get(node.id);
    if (!incoming || !hasNodeMetadataChanged(node, incoming)) {
      return node;
    }

    didChange = true;
    return {
      ...node,
      ariaLabel: incoming.ariaLabel,
      data: incoming.data,
    } as ClassicCanvasNode;
  });

  return didChange ? synced : current;
};
