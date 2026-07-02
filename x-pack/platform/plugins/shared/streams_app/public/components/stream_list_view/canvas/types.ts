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
  /** EUI icon type shown in the heading badge (e.g. a source logo). */
  icon?: string;
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
  /**
   * When true, the configured destination renders an attached routing "tab" on
   * its left (the "opinionated routing" / routing-with-inheritance result). The
   * tab exposes an `attached-routing` source handle that fans a branch out to a
   * newly-created destination.
   */
  attachedRouting?: boolean;
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

export interface RoutingBranch {
  /** Label shown for this exit line, e.g. "routing-1". */
  label: string;
  /** Optional share of traffic routed down this branch, e.g. "60%". */
  percentage?: string;
}

export interface RoutingNodeData {
  /** One entry per line exiting the routing node. */
  branches?: RoutingBranch[];
  [key: string]: unknown;
}

export type SourceFlowNode = Node<SourceNodeData, 'source'>;
export type DestinationFlowNode = Node<DestinationNodeData, 'destination'>;
export type PipelineFlowNode = Node<PipelineNodeData, 'pipeline'>;
export type RoutingFlowNode = Node<RoutingNodeData, 'routing'>;
