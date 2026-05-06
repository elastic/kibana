/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node } from '@xyflow/react';

import type { ComponentHealth } from '../../../../../common/types';

import type { OTelGraphNodeData } from './constants';
import type { OTelPipelineGroupNodeData } from './config_to_graph';
import { enrichNodesWithHealth, findComponentHealth } from './enrich_nodes_with_health';

const makeComponentNode = (
  id: string,
  label: string,
  componentType: OTelGraphNodeData['componentType']
): Node<OTelGraphNodeData> => ({
  id,
  type: 'component',
  position: { x: 0, y: 0 },
  data: { label, componentType },
});

const makePipelineGroupNode = (id: string, label: string): Node<OTelPipelineGroupNodeData> => ({
  id,
  type: 'pipelineGroup',
  position: { x: 0, y: 0 },
  data: { label },
});

describe('findComponentHealth', () => {
  it('returns undefined when health is undefined', () => {
    expect(findComponentHealth(undefined, 'receiver', 'otlp')).toBeUndefined();
  });

  it('returns undefined when component is not in health map', () => {
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {
        'receiver:filelog': { healthy: true, status: 'StatusOK' },
      },
    };
    expect(findComponentHealth(health, 'receiver', 'otlp')).toBeUndefined();
  });

  it('finds component at top level', () => {
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {
        'receiver:otlp': { healthy: true, status: 'StatusOK' },
      },
    };
    expect(findComponentHealth(health, 'receiver', 'otlp')).toEqual({
      healthy: true,
      status: 'StatusOK',
    });
  });

  it('finds component in nested health map', () => {
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {
        'extension:health_check': {
          healthy: true,
          status: 'StatusOK',
          component_health_map: {
            'receiver:otlp': { healthy: false, status: 'StatusRecoverableError' },
          },
        },
      },
    };
    expect(findComponentHealth(health, 'receiver', 'otlp')).toEqual({
      healthy: false,
      status: 'StatusRecoverableError',
    });
  });

  it('finds pipeline health', () => {
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {
        'pipeline:traces': { healthy: true, status: 'StatusOK' },
      },
    };
    expect(findComponentHealth(health, 'pipeline', 'traces')).toEqual({
      healthy: true,
      status: 'StatusOK',
    });
  });
});

describe('enrichNodesWithHealth', () => {
  it('does not modify nodes when health is undefined', () => {
    const nodes = [makeComponentNode('receiver::otlp', 'otlp', 'receiver')];
    enrichNodesWithHealth(nodes, undefined);
    expect(nodes[0].data.healthStatus).toBeUndefined();
  });

  it('sets healthStatus to healthy for healthy components', () => {
    const nodes = [makeComponentNode('receiver::otlp', 'otlp', 'receiver')];
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {
        'receiver:otlp': { healthy: true, status: 'StatusOK' },
      },
    };
    enrichNodesWithHealth(nodes, health);
    expect(nodes[0].data.healthStatus).toBe('healthy');
  });

  it('sets healthStatus to unhealthy for unhealthy components', () => {
    const nodes = [makeComponentNode('exporter::elasticsearch', 'elasticsearch', 'exporter')];
    const health: ComponentHealth = {
      healthy: false,
      status: 'StatusPermanentError',
      component_health_map: {
        'exporter:elasticsearch': { healthy: false, status: 'StatusPermanentError' },
      },
    };
    enrichNodesWithHealth(nodes, health);
    expect(nodes[0].data.healthStatus).toBe('unhealthy');
  });

  it('sets healthStatus to unknown for components not in health map', () => {
    const nodes = [makeComponentNode('processor::batch', 'batch', 'processor')];
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {},
    };
    enrichNodesWithHealth(nodes, health);
    expect(nodes[0].data.healthStatus).toBe('unknown');
  });

  it('sets healthStatus on pipelineGroup nodes', () => {
    const nodes = [makePipelineGroupNode('pipeline::traces', 'traces')];
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {
        'pipeline:traces': { healthy: true, status: 'StatusOK' },
      },
    };
    enrichNodesWithHealth(nodes, health);
    expect(nodes[0].data.healthStatus).toBe('healthy');
  });

  it('sets unknown healthStatus on pipelineGroup nodes not in health map', () => {
    const nodes = [makePipelineGroupNode('pipeline::metrics', 'metrics')];
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {},
    };
    enrichNodesWithHealth(nodes, health);
    expect(nodes[0].data.healthStatus).toBe('unknown');
  });

  it('enriches mixed node types correctly', () => {
    const nodes: Node[] = [
      makePipelineGroupNode('pipeline::traces', 'traces'),
      makeComponentNode('traces::otlp', 'otlp', 'receiver'),
      makeComponentNode('traces::batch', 'batch', 'processor'),
      makeComponentNode('traces::elasticsearch', 'elasticsearch', 'exporter'),
    ];
    const health: ComponentHealth = {
      healthy: true,
      status: 'StatusOK',
      component_health_map: {
        'pipeline:traces': { healthy: true, status: 'StatusOK' },
        'receiver:otlp': { healthy: true, status: 'StatusOK' },
        'exporter:elasticsearch': { healthy: false, status: 'StatusFatalError' },
      },
    };
    enrichNodesWithHealth(nodes, health);
    expect(nodes[0].data.healthStatus).toBe('healthy');
    expect(nodes[1].data.healthStatus).toBe('healthy');
    expect(nodes[2].data.healthStatus).toBe('unknown');
    expect(nodes[3].data.healthStatus).toBe('unhealthy');
  });
});
