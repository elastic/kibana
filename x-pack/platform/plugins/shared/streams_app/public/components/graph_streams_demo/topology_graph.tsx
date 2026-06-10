/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MarkerType,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEuiTheme } from '@elastic/eui';
import Dagre from '@dagrejs/dagre';

import type { GraphPreset } from './presets';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_W = 150;
const NODE_H = 44;
const GRAPH_H = 300;

// Strip "@stream.processing" / "@stream.reroutes" suffix to get node id
const toNodeId = (pipelineName: string) => pipelineName.replace(/@stream\.\w+$/, '');

// ---------------------------------------------------------------------------
// Node component
// ---------------------------------------------------------------------------

type TopologyNodeType = 'source' | 'pipeline' | 'destination';

interface TopologyNodeData extends Record<string, unknown> {
  label: string;
  nodeType: TopologyNodeType;
  active: boolean;
  landed: boolean; // final landing destination
}

const TopologyNode = ({ data }: { data: TopologyNodeData }) => {
  const { euiTheme } = useEuiTheme();

  const palette: Record<TopologyNodeType, { bg: string; text: string }> = {
    source: { bg: euiTheme.colors.vis.euiColorVis1, text: '#fff' },
    pipeline: { bg: euiTheme.colors.vis.euiColorVis2, text: '#fff' },
    destination: { bg: euiTheme.colors.vis.euiColorVis0, text: '#fff' },
  };

  const { bg, text } = palette[data.nodeType];

  const glowColor = data.landed ? euiTheme.colors.warning : euiTheme.colors.accentSecondary;
  const outline = data.landed
    ? `0 0 0 3px ${euiTheme.colors.warning}, 0 0 14px ${euiTheme.colors.warning}`
    : data.active
    ? `0 0 0 3px ${euiTheme.colors.accentSecondary}, 0 0 10px ${glowColor}`
    : undefined;

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: bg, border: 'none' }} />
      <div
        style={{
          background: bg,
          border: `2px solid ${bg}`,
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: text,
          width: NODE_W,
          height: NODE_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          overflow: 'hidden',
          boxSizing: 'border-box',
          lineHeight: 1.2,
          wordBreak: 'break-all',
          boxShadow: outline,
          transition: 'box-shadow 0.3s ease',
        }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: bg, border: 'none' }} />
    </>
  );
};

const nodeTypes: NodeTypes = { topology: TopologyNode };

// ---------------------------------------------------------------------------
// Condition label
// ---------------------------------------------------------------------------

const conditionToLabel = (where: Record<string, unknown> | undefined): string => {
  if (!where) return '';
  if ('field' in where && typeof where.field === 'string') {
    const field = (where.field as string).split('.').pop() ?? where.field;
    const op =
      'eq' in where ? `= ${where.eq}` : 'contains' in where ? `∋ ${where.contains}` : 'exists';
    return `${field} ${op}`;
  }
  if ('or' in where) return 'or (...)';
  if ('and' in where) return 'and (...)';
  return '...';
};

// ---------------------------------------------------------------------------
// Build raw nodes + edges from preset (no layout, no active state)
// ---------------------------------------------------------------------------

const buildGraph = (
  preset: GraphPreset
): { nodes: Array<Node<TopologyNodeData>>; edges: Edge[] } => {
  const { topology } = preset;
  const nodes: Array<Node<TopologyNodeData>> = [];
  const edges: Edge[] = [];

  const addNode = (id: string, nodeType: TopologyNodeType) => {
    nodes.push({
      id,
      type: 'topology',
      position: { x: 0, y: 0 },
      data: { label: id, nodeType, active: false, landed: false },
    });
  };

  Object.keys(topology.sources ?? {}).forEach((id) => addNode(id, 'source'));
  Object.keys(topology.pipelines ?? {}).forEach((id) => addNode(id, 'pipeline'));
  Object.keys(topology.destinations ?? {}).forEach((id) => addNode(id, 'destination'));

  topology.routing.forEach((edge, idx) => {
    edges.push({
      id: `e-${idx}`,
      source: edge.from,
      target: edge.to,
      label: conditionToLabel(edge.where),
      labelStyle: { fontSize: 10, fill: '#666' },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      style: { strokeWidth: 1.5 },
    });
  });

  return { nodes, edges };
};

// ---------------------------------------------------------------------------
// Dagre layout
// ---------------------------------------------------------------------------

const applyLayout = (
  nodes: Array<Node<TopologyNodeData>>,
  edges: Edge[]
): Array<Node<TopologyNodeData>> => {
  if (nodes.length === 0) return nodes;

  const g = new Dagre.graphlib.Graph({ directed: true })
    .setGraph({ rankdir: 'LR', ranksep: 90, nodesep: 40, marginx: 30, marginy: 30 })
    .setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  });

  Dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return pos
      ? {
          ...n,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          position: { x: Math.round(pos.x - NODE_W / 2), y: Math.round(pos.y - NODE_H / 2) },
        }
      : n;
  });
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TopologyGraphProps {
  preset: GraphPreset;
  /** executedPipelines from a route-test result — used to highlight the active path */
  executedPipelines?: string[];
  /** landedIn from a route-test result — highlights the final destination */
  landedIn?: string;
}

const TopologyGraphInner: React.FC<TopologyGraphProps> = ({
  preset,
  executedPipelines,
  landedIn,
}) => {
  const { euiTheme } = useEuiTheme();

  // Expensive: layout only changes when the preset changes
  const { layoutedNodes, baseEdges } = useMemo(() => {
    const raw = buildGraph(preset);
    return { layoutedNodes: applyLayout(raw.nodes, raw.edges), baseEdges: raw.edges };
  }, [preset]);

  // Cheap: active-path overlay — recomputes when route-test result changes
  const { nodes, edges } = useMemo(() => {
    if (!executedPipelines?.length) {
      return { nodes: layoutedNodes, edges: baseEdges };
    }

    const pathIds = executedPipelines.map(toNodeId);
    const activeSet = new Set(pathIds);

    // Consecutive pairs in the executed path
    const activePairs = new Set<string>();
    for (let i = 0; i < pathIds.length - 1; i++) {
      activePairs.add(`${pathIds[i]}->${pathIds[i + 1]}`);
    }

    const activeColor = euiTheme.colors.accentSecondary;
    const markerActive = {
      type: MarkerType.ArrowClosed,
      color: activeColor,
      width: 14,
      height: 14,
    };

    const activeNodes = layoutedNodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        active: activeSet.has(n.id),
        landed: n.id === landedIn,
      },
    }));

    const activeEdges = baseEdges.map((e) => {
      const isActive = activePairs.has(`${e.source}->${e.target}`);
      return isActive
        ? {
            ...e,
            style: { strokeWidth: 2.5, stroke: activeColor },
            markerEnd: markerActive,
            labelStyle: { fontSize: 10, fill: activeColor, fontWeight: 600 },
            labelBgStyle: { fill: euiTheme.colors.body, fillOpacity: 0.9 },
          }
        : e;
    });

    return { nodes: activeNodes, edges: activeEdges };
  }, [layoutedNodes, baseEdges, executedPipelines, landedIn, euiTheme]);

  // Re-fit whenever nodes change (preset switch or path highlight update)
  const { fitView } = useReactFlow();
  useEffect(() => {
    const id = setTimeout(() => fitView({ padding: 0.3 }), 100);
    return () => clearTimeout(id);
  }, [nodes, fitView]);

  return (
    <div style={{ height: GRAPH_H, border: `1px solid ${euiTheme.border.color}`, borderRadius: 6 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll={false}
        zoomOnPinch={false}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={euiTheme.border.color} gap={20} size={1} />
      </ReactFlow>
    </div>
  );
};

export const TopologyGraph: React.FC<TopologyGraphProps> = (props) => (
  <ReactFlowProvider>
    <TopologyGraphInner {...props} />
  </ReactFlowProvider>
);
