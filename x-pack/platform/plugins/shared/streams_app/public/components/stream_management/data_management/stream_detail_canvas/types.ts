/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { Edge, Node } from '@xyflow/react';
import type {
  ProcessingNodeRef,
  UnitEdgeForwarding,
  UnitEdgeProcessingTarget,
  UnitEdgeReference,
} from '../../../../services/unit_graph';
import type {
  DestinationSignal,
  DestinationViewModel,
} from '../../../streams_layout/destinations/types';
import type { UnitRoutableLine } from '../../../../services/unit_connections';
import type { SourceType } from '../../../streams_layout/sources/types';

export const SOURCE_NODE_TYPE = 'source';
export const DESTINATION_NODE_TYPE = 'destination';
export const ROUTING_NODE_TYPE = 'routing';
export const PROCESSING_NODE_TYPE = 'processing';
export const ANIMATED_EDGE_TYPE = 'animated';

export interface SourceNodeData extends Record<string, unknown> {
  sourceId?: string;
  /** Decides whether the node shows stats. A node without it shows none. */
  sourceType?: SourceType;
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
  bucket?: string;
  endpoint?: string;
  destinationId?: string;
  /** Decides whether the node shows stats. A node without it shows none. */
  destinationType?: DestinationViewModel['type'];
  signals?: DestinationSignal[];
  indexCount?: number;
  targetedIndexNames?: string[];
  remoteIndexNames?: string[];
}

export interface RoutingNodeRule {
  /** React Flow source handle id the rule's edges leave from. */
  handleId: string;
  label: string;
  isCatchAll: boolean;
  connected: boolean;
  action?: 'copy' | 'move';
  signals?: DestinationSignal[];
  /** Why the last save rejected the rule. */
  diagnostics?: string[];
}

export interface RoutingNodeData extends Record<string, unknown> {
  pipelineId: string;
  rules: RoutingNodeRule[];
  /** Why the last save rejected the routing, for every rule and the node itself. */
  diagnostics?: string[];
}

export interface ProcessingNodeData extends Record<string, unknown> {
  ref: ProcessingNodeRef;
  title: string;
  processorCount: number;
  editable: boolean;
  /**
   * What the output handle allows: `connect` starts new lines, `reconnect`
   * only moves the node's existing lines, and `fixed` allows neither.
   */
  output: ProcessingNodeOutput;
}

export type ProcessingNodeOutput = 'connect' | 'reconnect' | 'fixed';

/** Edge data for lines derived from the unit's pipelines. */
export interface UnitEdgeData extends Record<string, unknown> {
  /** Whether the line can be moved to another handle or unhooked. */
  editable: boolean;
  forwarding: UnitEdgeForwarding;
  /** The pipeline list the line is stored in; unset for the fixed lines between a pipeline's own nodes. */
  reference?: UnitEdgeReference;
  /** The slot "Add processing" writes to; unset when the line leads to a read-only node. */
  processingTarget?: UnitEdgeProcessingTarget;
  /** The line "Add routing" puts a routing node on; unset when the line cannot be routed. */
  routingLine?: UnitRoutableLine;
}

export type SourceNode = Node<SourceNodeData, typeof SOURCE_NODE_TYPE>;
export type DestinationNode = Node<DestinationNodeData, typeof DESTINATION_NODE_TYPE>;
export type RoutingNode = Node<RoutingNodeData, typeof ROUTING_NODE_TYPE>;
export type ProcessingNode = Node<ProcessingNodeData, typeof PROCESSING_NODE_TYPE>;
export type ClassicCanvasNode = SourceNode | DestinationNode | ProcessingNode | RoutingNode;
export type ClassicCanvasEdge = Edge<UnitEdgeData>;

export interface ClassicCanvasGraph {
  nodes: ClassicCanvasNode[];
  edges: ClassicCanvasEdge[];
}
