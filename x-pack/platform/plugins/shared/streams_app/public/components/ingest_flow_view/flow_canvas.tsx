/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEuiTheme } from '@elastic/eui';
import type { FlowGraphPayload, FlowThroughputPayload, FlowNode } from '@kbn/streams-plugin/common';
import { applyFlowLayout } from './layout';
import { ThroughputEdge, type ThroughputEdgeData } from './edges/throughput_edge';
import { AgentNode } from './nodes/agent_node';
import { AgentPolicyGroupNode } from './nodes/agent_policy_group_node';
import { AgentlessIntegrationNode } from './nodes/agentless_integration_node';
import { PrometheusScraperNode } from './nodes/prometheus_scraper_node';
import { CloudPipelineNode } from './nodes/cloud_pipeline_node';
import { BulkEndpointNode } from './nodes/bulk_endpoint_node';
import { WiredStreamNode } from './nodes/wired_stream_node';
import { ClassicStreamNode } from './nodes/classic_stream_node';
import { LaneLabelNode } from './nodes/lane_label_node';

// ── Types ────────────────────────────────────────────────────────────────────

// FlowNodeData is the React Flow node `data` shape — carries the full FlowNode
type FlowNodeData = FlowNode & { throughputOverride?: { docsPerSec: number } };

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  agentPolicy: AgentPolicyGroupNode,
  agentlessIntegration: AgentlessIntegrationNode,
  prometheusScraper: PrometheusScraperNode,
  cloudPipeline: CloudPipelineNode,
  bulkEndpoint: BulkEndpointNode,
  wiredStream: WiredStreamNode,
  classicStream: ClassicStreamNode,
  laneLabel: LaneLabelNode,
};

const edgeTypes: EdgeTypes = {
  throughput: ThroughputEdge,
};

// ── Converters ────────────────────────────────────────────────────────────────

const payloadNodeToFlowNode = (node: FlowNode): Node<FlowNodeData> => ({
  id: node.id,
  type: node.kind,
  position: { x: 0, y: 0 }, // layout will set real positions
  data: node as FlowNodeData,
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  ...(node.parentId ? { parentId: node.parentId } : {}),
});

const payloadEdgeToFlowEdge = (
  edge: FlowGraphPayload['edges'][number]
): Edge<ThroughputEdgeData> => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  type: 'throughput',
  data: {
    health: edge.health,
    throughput: edge.throughput,
    isMock: edge.isMock,
    kind: edge.kind,
  },
});

// ── Merge throughput overlay into nodes without re-running layout ─────────────

const mergeNodeThroughput = (
  node: Node<FlowNodeData>,
  throughput: FlowThroughputPayload | null
): Node<FlowNodeData> => {
  if (!throughput) return node;
  const perNode = throughput.perNode[node.id];
  const perNodeHealth = throughput.perNodeHealth[node.id];
  if (!perNode && !perNodeHealth) return node;
  return {
    ...node,
    data: {
      ...node.data,
      ...(perNode ? { throughput: perNode } : {}),
      ...(perNodeHealth ? { health: perNodeHealth } : {}),
    },
  };
};

const mergeEdgeThroughput = (
  edge: Edge<ThroughputEdgeData>,
  throughput: FlowThroughputPayload | null
): Edge<ThroughputEdgeData> => {
  if (!throughput) return edge;
  const perEdge = throughput.perEdge[edge.id];
  if (!perEdge) return edge;
  return {
    ...edge,
    data: {
      ...edge.data,
      throughput: perEdge,
      kind: edge.data?.kind ?? 'bulk->stream',
    },
  };
};

// ── Inner component (needs ReactFlowProvider in parent) ───────────────────────

interface FlowCanvasInnerProps {
  payload: FlowGraphPayload;
  throughput: FlowThroughputPayload | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

const FlowCanvasInner: React.FC<FlowCanvasInnerProps> = ({
  payload,
  throughput,
  selectedNodeId,
  onSelectNode,
}) => {
  const { euiTheme } = useEuiTheme();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<ThroughputEdgeData>>([]);

  // Re-run layout only when the topology changes (not on throughput poll)
  const nodeCount = payload.nodes.length;
  const edgeCount = payload.edges.length;

  useEffect(() => {
    const rawNodes = payload.nodes.map(payloadNodeToFlowNode);
    const rawEdges = payload.edges.map(payloadEdgeToFlowEdge);
    const { nodes: laidOutNodes } = applyFlowLayout(rawNodes, rawEdges);
    setNodes(laidOutNodes);
    setEdges(rawEdges);
    // fitView is called after nodes are placed
    requestAnimationFrame(() => {
      fitView({ padding: 0.1 });
    });
    // Only re-run when topology changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeCount, edgeCount, setNodes, setEdges, fitView]);

  // Merge throughput overlay without re-running layout
  useEffect(() => {
    if (!throughput) return;
    setNodes((prev) => prev.map((n) => mergeNodeThroughput(n, throughput)));
    setEdges((prev) => prev.map((e) => mergeEdgeThroughput(e, throughput)));
  }, [throughput, setNodes, setEdges]);

  // Reflect external selectedNodeId changes (e.g. deep-link)
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  const defaultEdgeOptions = useMemo(
    () => ({
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 10,
        height: 10,
        color: euiTheme.colors.subduedText,
      },
    }),
    [euiTheme]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      fitView
      fitViewOptions={{ padding: 0.1 }}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      css={css`
        background: ${euiTheme.colors.backgroundBasePlain};
      `}
    >
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
};

// ── Public component (provides ReactFlowProvider) ─────────────────────────────

export interface FlowCanvasProps {
  payload: FlowGraphPayload;
  throughput: FlowThroughputPayload | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
