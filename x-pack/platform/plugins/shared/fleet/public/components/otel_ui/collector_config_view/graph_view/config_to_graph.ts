/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Node, Edge } from '@xyflow/react';

import type { OTelCollectorConfig } from '../../../../../common/types';
import { ALL_PIPELINES, SIGNAL_PREFIX, getSignalType } from '../utils';

import type { OTelComponentType, OTelGraphNodeData } from './constants';

export interface OTelPipelineGroupNodeData {
  label: string;
  [key: string]: unknown;
}

interface ConfigToGraphResult {
  nodes: Array<Node<OTelGraphNodeData> | Node<OTelPipelineGroupNodeData>>;
  edges: Edge[];
  isMergedView: boolean;
}

const getPipelineEntries = (
  allPipelines: NonNullable<NonNullable<OTelCollectorConfig['service']>['pipelines']>,
  selectedPipelineId: string
): Array<[string, (typeof allPipelines)[string]]> => {
  if (selectedPipelineId === ALL_PIPELINES) {
    return Object.entries(allPipelines);
  }
  if (selectedPipelineId.startsWith(SIGNAL_PREFIX)) {
    const signalType = selectedPipelineId.slice(SIGNAL_PREFIX.length);
    return Object.entries(allPipelines).filter(([id]) => getSignalType(id) === signalType);
  }
  return Object.entries(allPipelines).filter(([id]) => id === selectedPipelineId);
};

const buildComponentTypeMap = (
  config: OTelCollectorConfig,
  referencedComponents: Set<string>
): Map<string, OTelComponentType> => {
  const typeMap = new Map<string, OTelComponentType>();
  const sections: Array<{ section: Record<string, any> | undefined; type: OTelComponentType }> = [
    { section: config.receivers, type: 'receiver' },
    { section: config.processors, type: 'processor' },
    { section: config.connectors, type: 'connector' },
    { section: config.exporters, type: 'exporter' },
  ];
  for (const { section, type } of sections) {
    if (section) {
      for (const id of Object.keys(section)) {
        if (referencedComponents.has(id)) {
          typeMap.set(id, type);
        }
      }
    }
  }
  return typeMap;
};

const buildEdges = (
  pipelineEntries: Array<
    [string, { receivers?: string[]; processors?: string[]; exporters?: string[] }]
  >,
  nodeIdFn: (componentId: string, pipelineId: string) => string
): Edge[] => {
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];

  const addEdge = (source: string, target: string) => {
    const key = `${source}->${target}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({ id: key, source, target });
    }
  };

  for (const [pipelineId, pipeline] of pipelineEntries) {
    const { receivers = [], processors = [], exporters = [] } = pipeline;

    if (processors.length > 0) {
      for (const receiver of receivers) {
        addEdge(nodeIdFn(receiver, pipelineId), nodeIdFn(processors[0], pipelineId));
      }
      for (let i = 0; i < processors.length - 1; i++) {
        addEdge(nodeIdFn(processors[i], pipelineId), nodeIdFn(processors[i + 1], pipelineId));
      }
      for (const exporter of exporters) {
        addEdge(
          nodeIdFn(processors[processors.length - 1], pipelineId),
          nodeIdFn(exporter, pipelineId)
        );
      }
    } else {
      for (const receiver of receivers) {
        for (const exporter of exporters) {
          addEdge(nodeIdFn(receiver, pipelineId), nodeIdFn(exporter, pipelineId));
        }
      }
    }
  }

  return edges;
};

const buildMergedGraph = (
  config: OTelCollectorConfig,
  pipelineEntries: Array<
    [string, { receivers?: string[]; processors?: string[]; exporters?: string[] }]
  >,
  componentTypeMap: Map<string, OTelComponentType>
): ConfigToGraphResult => {
  const nodeMap = new Map<string, Node<OTelGraphNodeData>>();

  for (const [id, type] of componentTypeMap) {
    nodeMap.set(id, {
      id,
      type: 'component',
      position: { x: 0, y: 0 },
      data: { label: id, componentType: type },
    });
  }

  const edges = buildEdges(pipelineEntries, (componentId) => componentId);

  return { nodes: Array.from(nodeMap.values()), edges, isMergedView: true };
};

const PIPELINE_GROUP_PREFIX = 'pipeline::';

const buildGroupedGraph = (
  config: OTelCollectorConfig,
  pipelineEntries: Array<
    [string, { receivers?: string[]; processors?: string[]; exporters?: string[] }]
  >,
  componentTypeMap: Map<string, OTelComponentType>
): ConfigToGraphResult => {
  const nodes: Array<Node<OTelGraphNodeData> | Node<OTelPipelineGroupNodeData>> = [];
  const nodeSet = new Set<string>();

  for (const [pipelineId, pipeline] of pipelineEntries) {
    const groupId = `${PIPELINE_GROUP_PREFIX}${pipelineId}`;

    nodes.push({
      id: groupId,
      type: 'pipelineGroup',
      position: { x: 0, y: 0 },
      data: { label: pipelineId },
    });

    const componentIds = [
      ...(pipeline.receivers ?? []),
      ...(pipeline.processors ?? []),
      ...(pipeline.exporters ?? []),
    ];

    for (const componentId of componentIds) {
      const nodeId = `${pipelineId}::${componentId}`;
      if (!nodeSet.has(nodeId)) {
        nodeSet.add(nodeId);
        const componentType = componentTypeMap.get(componentId);
        if (componentType) {
          nodes.push({
            id: nodeId,
            type: 'component',
            position: { x: 0, y: 0 },
            parentId: groupId,
            extent: 'parent' as const,
            data: { label: componentId, componentType },
          });
        }
      }
    }
  }

  const edges = buildEdges(
    pipelineEntries,
    (componentId, pipelineId) => `${pipelineId}::${componentId}`
  );

  const connectorIds = config.connectors ? Object.keys(config.connectors) : [];
  const edgeSet = new Set(edges.map((e) => e.id));

  for (const connectorId of connectorIds) {
    const exporterPipelines = pipelineEntries
      .filter(([, p]) => (p.exporters ?? []).includes(connectorId))
      .map(([id]) => id);
    const receiverPipelines = pipelineEntries
      .filter(([, p]) => (p.receivers ?? []).includes(connectorId))
      .map(([id]) => id);

    for (const fromPipeline of exporterPipelines) {
      for (const toPipeline of receiverPipelines) {
        const sourceId = `${fromPipeline}::${connectorId}`;
        const targetId = `${toPipeline}::${connectorId}`;
        const edgeId = `${sourceId}->${targetId}`;
        if (sourceId !== targetId && !edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({
            id: edgeId,
            source: sourceId,
            target: targetId,
            style: { strokeDasharray: '6 3' },
            data: { isCrossGroup: true },
          });
        }
      }
    }
  }

  return { nodes, edges, isMergedView: false };
};

export const configToGraph = (
  config: OTelCollectorConfig,
  selectedPipelineId: string = ALL_PIPELINES
): ConfigToGraphResult => {
  const allPipelines = config.service?.pipelines;
  if (!allPipelines) {
    return { nodes: [], edges: [], isMergedView: true };
  }

  const pipelineEntries = getPipelineEntries(allPipelines, selectedPipelineId);

  const referencedComponents = new Set<string>();
  for (const [, pipeline] of pipelineEntries) {
    for (const id of pipeline.receivers ?? []) referencedComponents.add(id);
    for (const id of pipeline.processors ?? []) referencedComponents.add(id);
    for (const id of pipeline.exporters ?? []) referencedComponents.add(id);
  }

  const componentTypeMap = buildComponentTypeMap(config, referencedComponents);

  if (pipelineEntries.length > 1) {
    return buildGroupedGraph(config, pipelineEntries, componentTypeMap);
  }

  return buildMergedGraph(config, pipelineEntries, componentTypeMap);
};
