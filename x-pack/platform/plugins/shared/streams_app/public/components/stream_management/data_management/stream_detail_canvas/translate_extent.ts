/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, CoordinateExtent } from '@xyflow/react';
import { NODE_HEIGHT_ESTIMATE, NODE_WIDTH_ESTIMATE, PAN_MARGIN } from './canvas_constants';

/**
 * Bounds panning to the graph's footprint plus a comfortable margin so people
 * can move a little past the content but never drift into infinite empty space.
 * Uses each node's measured DOM size when React Flow has it, falling back to a
 * rough estimate on the first render.
 */
export const getTranslateExtent = (nodes: Node[]): CoordinateExtent | undefined => {
  if (nodes.length === 0) {
    return undefined;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const width = node.measured?.width ?? NODE_WIDTH_ESTIMATE;
    const height = node.measured?.height ?? NODE_HEIGHT_ESTIMATE;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  return [
    [minX - PAN_MARGIN, minY - PAN_MARGIN],
    [maxX + PAN_MARGIN, maxY + PAN_MARGIN],
  ];
};
