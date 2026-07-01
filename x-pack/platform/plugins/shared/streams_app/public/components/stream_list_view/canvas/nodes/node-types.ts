/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The React Flow node-type registry mapping node.type → component.

import type { NodeTypes } from '@xyflow/react';
import { SourceNode } from './source-node';
import { DestinationNode } from './destination-node';
import { PipelineNode } from './pipeline-node';
import { RoutingNode, RoutingEndpointNode } from './routing-nodes';

export const nodeTypes: NodeTypes = {
  source: SourceNode,
  destination: DestinationNode,
  pipeline: PipelineNode,
  routing: RoutingNode,
  routingEndpoint: RoutingEndpointNode,
};
