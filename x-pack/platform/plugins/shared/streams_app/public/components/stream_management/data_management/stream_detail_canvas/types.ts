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
} from '../../../../services/unit_graph';
import type { DestinationSignal } from '../../../streams_layout/destinations/types';

export const SOURCE_NODE_TYPE = 'source';
export const DESTINATION_NODE_TYPE = 'destination';
export const PROCESSING_NODE_TYPE = 'processing';
export const ANIMATED_EDGE_TYPE = 'animated';

export interface SourceNodeData extends Record<string, unknown> {
  sourceId?: string;
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

export interface ProcessingNodeData extends Record<string, unknown> {
  ref: ProcessingNodeRef;
  title: string;
  processorCount: number;
  editable: boolean;
}

/** Edge data for lines derived from the unit's pipelines. */
export interface UnitEdgeData extends Record<string, unknown> {
  /** Lines into a destination from a source or pipeline processing can be reconnected or unhooked. */
  unitConnection?: boolean;
  forwarding?: UnitEdgeForwarding;
  /** The slot "Add processing" writes to; unset when the line leads to a read-only node. */
  processingTarget?: UnitEdgeProcessingTarget;
}

export type SourceNode = Node<SourceNodeData, typeof SOURCE_NODE_TYPE>;
export type DestinationNode = Node<DestinationNodeData, typeof DESTINATION_NODE_TYPE>;
export type ProcessingNode = Node<ProcessingNodeData, typeof PROCESSING_NODE_TYPE>;
export type ClassicCanvasNode = SourceNode | DestinationNode | ProcessingNode;
export type ClassicCanvasEdge = Edge<UnitEdgeData>;

export interface ClassicCanvasGraph {
  nodes: ClassicCanvasNode[];
  edges: ClassicCanvasEdge[];
}
