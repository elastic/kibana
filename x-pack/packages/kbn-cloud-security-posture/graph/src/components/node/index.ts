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
export { LabelNode } from './label_node';
export { EdgeGroupNode } from './edge_group_node';

export type NodeShape =
  | 'hexagon'
  | 'pentagon'
  | 'ellipse'
  | 'rectangle'
  | 'diamond'
  | 'label'
  | 'group';

interface BaseNodeData extends Record<string, unknown> {
  id: string;
  label?: string;
  icon?: string;
  position: PositionXY;
}

export interface EntityNodeData extends BaseNodeData {
  color?: 'primary' | 'danger' | 'warning';
  shape: 'hexagon' | 'pentagon' | 'ellipse' | 'rectangle' | 'diamond';
  interactive: boolean;
  expandButtonClick?: (e: React.MouseEvent<HTMLElement>, node: NodeProps) => void;
}

export interface GroupNodeData extends BaseNodeData {
  size?: { width: number; height: number };
  shape: 'group';
}

export interface LabelNodeData extends BaseNodeData {
  color?: 'primary' | 'danger' | 'warning';
  source: string;
  target: string;
  shape: 'label';
  parentId?: string;
  interactive: boolean;
  expandButtonClick?: (e: React.MouseEvent<HTMLElement>, node: NodeProps) => void;
}

export type NodeData = EntityNodeData | GroupNodeData | LabelNodeData;

export type NodeProps = xyNodeProps<Node<NodeData>>;
