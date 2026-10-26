/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { Edge, Node } from '@xyflow/react';
import type { DestinationSignal } from '../../../streams_layout/destinations/types';

export const SOURCE_NODE_TYPE = 'source';
export const DESTINATION_NODE_TYPE = 'destination';
export const ROUTING_NODE_TYPE = 'routing';
export const ANIMATED_EDGE_TYPE = 'animated';

export interface SourceNodeData extends Record<string, unknown> {
  sourceId?: string;
  /** A source has one outgoing connection, so a connected source cannot start another. */
  hasConnection?: boolean;
  unconfiguredNodeId?: string;
  configurationLabel?: string;
  title: string;
  subtitle: string;
  iconType?: IconType;
  signals?: DestinationSignal[];
}

export interface DestinationNodeData extends Record<string, unknown> {
  title: string;
  subtitle?: string;
  streamName?: string;
  destinationId?: string;
  signals?: DestinationSignal[];
  indexCount?: number;
  targetedIndexNames?: string[];
}

export interface RoutingNodeRule {
  /** React Flow source handle id the rule's edges leave from. */
  handleId: string;
  label: string;
  isCatchAll: boolean;
  action?: 'copy' | 'move';
}

export interface RoutingNodeData extends Record<string, unknown> {
  pipelineId: string;
  rules: RoutingNodeRule[];
}

export type SourceNode = Node<SourceNodeData, typeof SOURCE_NODE_TYPE>;
export type DestinationNode = Node<DestinationNodeData, typeof DESTINATION_NODE_TYPE>;
export type RoutingNode = Node<RoutingNodeData, typeof ROUTING_NODE_TYPE>;
export type ClassicCanvasNode = SourceNode | DestinationNode | RoutingNode;
export type ClassicCanvasEdge = Edge;

export interface ClassicCanvasGraph {
  nodes: ClassicCanvasNode[];
  edges: ClassicCanvasEdge[];
}
