/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The data shapes carried by each canvas node type, and their React Flow node
// aliases.

import type { Node } from '@xyflow/react';

export interface SourceNodeData {
  title: string;
  subtitle: string;
  rate: string;
  [key: string]: unknown;
}

export type DestinationMode = 'unconfigured' | 'configuring' | 'configured';
export type DestinationStorage = 'local' | 'external';

export interface DestinationNodeData {
  title: string;
  mode: DestinationMode;
  meta?: string;
  status?: string;
  storage?: DestinationStorage;
  [key: string]: unknown;
}

export interface PipelineNodeData {
  title: string;
  /** Throughput shown in the hover stats card, e.g. "3.8k eps". */
  eps?: string;
  /** Processing latency shown in the hover stats card, e.g. "190ms". */
  latency?: string;
  [key: string]: unknown;
}

export interface RoutingNodeData {
  [key: string]: unknown;
}

export type SourceFlowNode = Node<SourceNodeData, 'source'>;
export type DestinationFlowNode = Node<DestinationNodeData, 'destination'>;
export type PipelineFlowNode = Node<PipelineNodeData, 'pipeline'>;
export type RoutingFlowNode = Node<RoutingNodeData, 'routing'>;
