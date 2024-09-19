/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, NodeProps as xyNodeProps } from '@xyflow/react';
import { PositionXY } from '..';

export { DiamondNode } from './diamond_node';
export { EllipseNode } from './ellipse_node';
export { HexagonNode } from './hexagon_node';
export { PentagonNode } from './pentagon_node';
export { RectangleNode } from './rectangle_node';

export type NodeShape = 'hexagon' | 'pentagon' | 'ellipse' | 'rectangle' | 'diamond';

export interface NodeData extends Record<string, unknown> {
  id: string;
  label?: string;
  color?: 'primary' | 'danger' | 'warning';
  shape: NodeShape;
  icon?: string;
  interactive: boolean;
  position: PositionXY;
  expandButtonClick?: (e: React.MouseEvent<HTMLElement>, node: NodeProps) => void;
}

export type NodeProps = xyNodeProps<Node<NodeData>>;
