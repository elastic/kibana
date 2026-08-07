/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { Edge, Node } from '@xyflow/react';

export const SOURCE_NODE_TYPE = 'source';
export const DESTINATION_NODE_TYPE = 'destination';
export const ANIMATED_EDGE_TYPE = 'animated';

export interface SourceNodeData extends Record<string, unknown> {
  title: string;
  subtitle: string;
  iconType: IconType;
}

export interface DestinationNodeData extends Record<string, unknown> {
  title: string;
  hasProcessing: boolean;
}

export type SourceNode = Node<SourceNodeData, typeof SOURCE_NODE_TYPE>;
export type DestinationNode = Node<DestinationNodeData, typeof DESTINATION_NODE_TYPE>;
export type ClassicCanvasNode = SourceNode | DestinationNode;
export type ClassicCanvasEdge = Edge;

export interface ClassicCanvasGraph {
  nodes: ClassicCanvasNode[];
  edges: ClassicCanvasEdge[];
}
