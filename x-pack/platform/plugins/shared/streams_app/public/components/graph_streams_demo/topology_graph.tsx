/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MarkerType,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEuiTheme } from '@elastic/eui';
import Dagre from '@dagrejs/dagre';

import type { GraphPreset } from './presets';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const NODE_W = 150;
const NODE_H = 44;
const GRAPH_H = 300;

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

type TopologyNodeType = 'source' | 'pipeline' | 'destination';

interface TopologyNodeData extends Record<string, unknown> {
  label: string;
  nodeType: TopologyNodeType;
}

const TopologyNode = ({ data }: { data: TopologyNodeData }) => {
  const { euiTheme } = useEuiTheme();

  const palette: Record<TopologyNodeType, { bg: string; border: string; text: string }> = {
    source: {
      bg: euiTheme.colors.vis.euiColorVis1,
      border: euiTheme.colors.vis.euiColorVis1,
      text: '#fff',
    },
    pipeline: {
      bg: euiTheme.colors.vis.euiColorVis2,
      border: euiTheme.colors.vis.euiColorVis2,
      text: '#fff',
    },
    destination: {
      bg: euiTheme.colors.vis.euiColorVis0,
      border: euiTheme.colors.vis.euiColorVis0,
      text: '#fff',
    },
  };

  const { bg, border, text } = palette[data.nodeType];

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: border, border: 'none' }}
      />
      <div
        style={{
          background: bg,
          border: `2px solid ${border}`,
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
        }}
      >
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: border, border: 'none' }}
      />
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
// Build nodes + edges from a preset
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
      position: { x: 0, y: 0 }, // overwritten by Dagre
      data: { label: id, nodeType },
    });
  };

  Object.keys(topology.sources ?? {}).forEach((id) => addNode(id, 'source'));
  Object.keys(topology.pipelines ?? {}).forEach((id) => addNode(id, 'pipeline'));
  Object.keys(topology.destinations ?? {}).forEach((id) => addNode(id, 'destination'));

  topology.routing.forEach((edge, idx) => {
    const label = conditionToLabel(edge.where);
    edges.push({
      id: `e-${idx}`,
      source: edge.from,
      target: edge.to,
      label,
      labelStyle: { fontSize: 10, fill: '#666' },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      style: { strokeWidth: 1.5 },
    });
  });

  return { nodes, edges };
};

// ---------------------------------------------------------------------------
// Dagre layout (LR, simple — no compound groups)
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
}

const TopologyGraphInner: React.FC<TopologyGraphProps> = ({ preset }) => {
  const { euiTheme } = useEuiTheme();

  const { nodes, edges } = useMemo(() => {
    const raw = buildGraph(preset);
    return { nodes: applyLayout(raw.nodes, raw.edges), edges: raw.edges };
  }, [preset]);

  const onInit = (instance: ReactFlowInstance) => {
    setTimeout(() => instance.fitView({ padding: 0.25 }), 50);
  };

  return (
    <div style={{ height: GRAPH_H, border: `1px solid ${euiTheme.border.color}`, borderRadius: 6 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll={false}
        zoomOnPinch={false}
        minZoom={0.3}
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
