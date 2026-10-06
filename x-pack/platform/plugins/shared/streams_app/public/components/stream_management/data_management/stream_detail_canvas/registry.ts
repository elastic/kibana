/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EdgeTypes, NodeTypes } from '@xyflow/react';
import { AnimatedEdge } from './edges/animated_edge';
import { SourceNode } from './nodes/source_node';
import { DestinationNode } from './nodes/destination_node';
import { ANIMATED_EDGE_TYPE, DESTINATION_NODE_TYPE, SOURCE_NODE_TYPE } from './types';

/**
 * Central registry mapping React Flow node/edge type identifiers to their
 * components. Adding a new kind (e.g. pipeline, routing) is a single line here
 */
export const canvasNodeTypes: NodeTypes = {
  [SOURCE_NODE_TYPE]: SourceNode,
  [DESTINATION_NODE_TYPE]: DestinationNode,
  // future: [PIPELINE_NODE_TYPE]: PipelineNode, [ROUTING_NODE_TYPE]: RoutingNode,
};

export const canvasEdgeTypes: EdgeTypes = {
  [ANIMATED_EDGE_TYPE]: AnimatedEdge,
};
