/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node } from '@xyflow/react';

import type { ComponentHealth } from '../../../../../common/types';
import { findComponentHealth, getComponentHealthStatus } from '../utils';

import type { OTelGraphNodeData } from './constants';
import type { OTelPipelineGroupNodeData } from './config_to_graph';

export { findComponentHealth } from '../utils';

export const enrichNodesWithHealth = (
  nodes: Array<Node>,
  health: ComponentHealth | undefined
): void => {
  if (!health) return;
  for (const node of nodes) {
    if (node.type === 'component') {
      const { componentType, label, pipelineId } = node.data as OTelGraphNodeData;
      let componentHealth: ComponentHealth | undefined;
      if (pipelineId) {
        const pipelineHealth = findComponentHealth(health, 'pipeline', pipelineId);
        componentHealth =
          findComponentHealth(pipelineHealth, componentType, label) ??
          findComponentHealth(health, componentType, label);
      } else {
        componentHealth = findComponentHealth(health, componentType, label);
      }
      node.data.healthStatus = getComponentHealthStatus(componentHealth);
    } else if (node.type === 'pipelineGroup') {
      const { label } = node.data as OTelPipelineGroupNodeData;
      const pipelineHealth = findComponentHealth(health, 'pipeline', label);
      node.data.healthStatus = getComponentHealthStatus(pipelineHealth);
    }
  }

  for (const node of nodes) {
    if (node.type === 'pipelineGroup') {
      const children = nodes.filter((n) => n.parentId === node.id && n.type === 'component');
      if (children.length > 0) {
        const healthy = children.filter((c) => c.data.healthStatus === 'healthy').length;
        (node.data as OTelPipelineGroupNodeData).healthCounts = {
          healthy,
          total: children.length,
        };
      }
    }
  }
};
