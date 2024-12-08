/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  EntityNodeDataModel,
  GroupNodeDataModel,
  LabelNodeDataModel,
  EdgeDataModel,
  NodeShape,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import type { Node, NodeProps as xyNodeProps } from '@xyflow/react';
import type { Edge, EdgeProps as xyEdgeProps } from '@xyflow/react';

export interface Size {
  width: number;
  height: number;
}

interface BaseNodeDataViewModel {
  interactive?: boolean;
}

export type NodeClickCallback = (e: React.MouseEvent<HTMLElement>, node: NodeProps) => void;

export type ExpandButtonClickCallback = (
  e: React.MouseEvent<HTMLElement>,
  node: NodeProps,
  unToggleCallback: () => void
) => void;

export interface EntityNodeViewModel
  extends Record<string, unknown>,
    EntityNodeDataModel,
    BaseNodeDataViewModel {
  expandButtonClick?: ExpandButtonClickCallback;
  nodeClick?: NodeClickCallback;
}

export interface GroupNodeViewModel
  extends Record<string, unknown>,
    GroupNodeDataModel,
    BaseNodeDataViewModel {}

export interface LabelNodeViewModel
  extends Record<string, unknown>,
    LabelNodeDataModel,
    BaseNodeDataViewModel {
  expandButtonClick?: ExpandButtonClickCallback;
}

export type NodeViewModel = EntityNodeViewModel | GroupNodeViewModel | LabelNodeViewModel;

export type NodeProps = xyNodeProps<Node<NodeViewModel>>;

export interface EdgeViewModel extends Record<string, unknown>, EdgeDataModel {}

export type EdgeProps = xyEdgeProps<
  Edge<
    EdgeViewModel & {
      sourceShape: NodeShape;
      targetShape: NodeShape;
    }
  >
>;
