/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityNodeDataModel,
  GroupNodeDataModel,
  LabelNodeDataModel,
  EdgeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import type { Node, NodeProps as xyNodeProps } from '@xyflow/react';
import type { Edge, EdgeProps as xyEdgeProps } from '@xyflow/react';

export interface PositionXY {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface GraphMetadata {
  nodes: { [key: string]: { edgesIn: number; edgesOut: number } };
  edges: {
    [key: string]: { source: string; target: string; edgesStacked: number; edges: string[] };
  };
}

interface BaseNodeDataViewModel {
  position: PositionXY;
  interactive?: boolean;
}

export interface EntityNodeViewModel
  extends Record<string, unknown>,
    EntityNodeDataModel,
    BaseNodeDataViewModel {
  expandButtonClick?: (e: React.MouseEvent<HTMLElement>, node: NodeProps) => void;
}

export interface GroupNodeViewModel
  extends Record<string, unknown>,
    GroupNodeDataModel,
    BaseNodeDataViewModel {
  size?: Size;
}

export interface LabelNodeViewModel
  extends Record<string, unknown>,
    LabelNodeDataModel,
    BaseNodeDataViewModel {
  expandButtonClick?: (e: React.MouseEvent<HTMLElement>, node: NodeProps) => void;
}

export type NodeViewModel = EntityNodeViewModel | GroupNodeViewModel | LabelNodeViewModel;

export type NodeProps = xyNodeProps<Node<NodeViewModel>>;

export interface EdgeViewModel extends Record<string, unknown>, EdgeDataModel {
  graphMetadata?: GraphMetadata;
  interactive?: boolean;
  onClick?: (e: React.MouseEvent<HTMLElement>, edge: EdgeProps) => void;
}

export type EdgeProps = xyEdgeProps<Edge<EdgeViewModel>>;
