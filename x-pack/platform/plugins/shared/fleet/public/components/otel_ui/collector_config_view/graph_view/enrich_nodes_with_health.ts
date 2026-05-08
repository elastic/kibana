/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node } from '@xyflow/react';

import type { ComponentHealth } from '../../../../../common/types';
import { getComponentHealthStatus } from '../utils';

import type { OTelComponentType, OTelGraphNodeData } from './constants';
import type { OTelPipelineGroupNodeData } from './config_to_graph';

export const findComponentHealth = (
  health: ComponentHealth | undefined,
  componentType: OTelComponentType,
  componentId: string
): ComponentHealth | undefined => {
  const key = `${componentType}:${componentId}`;
  const map = health?.component_health_map;
  if (!map) {
    return undefined;
  }
  if (map[key]) {
    return map[key];
  }
  for (const entry of Object.values(map)) {
    const found = findComponentHealth(entry, componentType, componentId);
    if (found) {
      return found;
    }
  }
  return undefined;
};

export const enrichNodesWithHealth = (
  nodes: Array<Node>,
  health: ComponentHealth | undefined
): void => {
  if (!health) return;
  for (const node of nodes) {
    if (node.type === 'component') {
      const { componentType, label } = node.data as OTelGraphNodeData;
      const componentHealth = findComponentHealth(health, componentType, label);
      node.data.healthStatus = getComponentHealthStatus(componentHealth);
    } else if (node.type === 'pipelineGroup') {
      const { label } = node.data as OTelPipelineGroupNodeData;
      const pipelineHealth = findComponentHealth(health, 'pipeline', label);
      node.data.healthStatus = getComponentHealthStatus(pipelineHealth);
    }
  }
};
