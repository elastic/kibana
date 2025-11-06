/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import '@xyflow/react/dist/style.css';
import type { NodeTypes } from '@xyflow/react';
import type { ScratchpadNode } from '../../hooks/use_scratchpad_state';
import { SimpleNode } from '../nodes/simple_node';

const nodeTypes: NodeTypes = {
  esql_query: SimpleNode as any,
  text_note: SimpleNode as any,
  kibana_link: SimpleNode as any,
};

interface ScratchpadCanvasProps {
  nodes: ScratchpadNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect?: (connection: Connection) => void;
  onNodeClick?: (event: React.MouseEvent, node: ScratchpadNode) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: ScratchpadNode) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
  shouldFitView?: boolean;
  layoutKey?: number;
}

export function ScratchpadCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
  shouldFitView,
  layoutKey,
}: ScratchpadCanvasProps) {
  const { euiTheme } = useEuiTheme();
  const [reactFlowNodes, setReactFlowNodes, onNodesChangeInternal] = useNodesState(nodes);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChangeInternal] = useEdgesState(edges);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const layoutKeyRef = useRef<number | undefined>(layoutKey);

  // Trigger fitView when shouldFitView is true
  useEffect(() => {
    if (shouldFitView && reactFlowInstanceRef.current) {
      setTimeout(() => {
        reactFlowInstanceRef.current?.fitView({ padding: 0.2 });
      }, 100);
    }
  }, [shouldFitView]);

  useEffect(() => {
    const edgeIds = new Set(edges.map((e) => e.id));
    const reactFlowEdgeIds = new Set(reactFlowEdges.map((e) => e.id));

    // Only sync if edges were added or removed
    if (edges.length !== reactFlowEdges.length || !edges.every((e) => reactFlowEdgeIds.has(e.id))) {
      setReactFlowEdges(edges);
    }
  }, [edges, reactFlowEdges, setReactFlowEdges]);

  // Sync external nodes/edges with ReactFlow state
  // IMPORTANT: Do NOT sync positions during drag - only sync structure, data, selection, and layout
  useEffect(() => {
    // Check if layoutKey changed
    const layoutKeyChanged = layoutKey !== undefined && layoutKeyRef.current !== layoutKey;
    if (layoutKeyChanged && layoutKey !== undefined) {
      layoutKeyRef.current = layoutKey;
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const reactFlowNodeIds = new Set(reactFlowNodes.map((n) => n.id));
    const nodeIdsMatch = nodes.every((n) => reactFlowNodeIds.has(n.id));
    const reactFlowNodeIdsMatch = reactFlowNodes.every((n) => nodeIds.has(n.id));

    // Check if node data has changed (for immediate updates after editing)
    const nodeDataChanged = nodes.some((node) => {
      const reactFlowNode = reactFlowNodes.find((n) => n.id === node.id);
      if (!reactFlowNode) return true;
      // Deep compare node data (position is a node property, not in data)
      return JSON.stringify(node.data) !== JSON.stringify(reactFlowNode.data);
    });

    // Check if selection has changed
    const selectionChanged = nodes.some((node) => {
      const reactFlowNode = reactFlowNodes.find((n) => n.id === node.id);
      if (!reactFlowNode) return false;
      return Boolean(node.data.selected) !== Boolean(reactFlowNode.data.selected);
    });

    // Only sync if nodes were added/removed OR if node data changed OR if selection changed OR if layoutKey changed
    // Do NOT sync based on position changes - positions flow FROM ReactFlow TO external state during drag
    if (
      nodes.length !== reactFlowNodes.length ||
      !nodeIdsMatch ||
      !reactFlowNodeIdsMatch ||
      nodeDataChanged ||
      selectionChanged ||
      layoutKeyChanged
    ) {
      // Merge nodes: use external data/selection, preserve ReactFlow positions (unless layout was triggered)
      const nodesWithPositions = nodes.map((node) => {
        const existingNode = reactFlowNodes.find((n) => n.id === node.id);
        if (!existingNode) {
          return node;
        }
        // If layoutKey changed, use external position (layout was triggered)
        if (layoutKeyChanged) {
          return node;
        }
        // Otherwise, preserve ReactFlow's position (user drag) but update data and selection
        return {
          ...node,
          position: existingNode.position,
        };
      });
      setReactFlowNodes(nodesWithPositions);
    }
  }, [nodes, reactFlowNodes, setReactFlowNodes, layoutKey]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Handle selection changes first - clear all selections, then apply new ones
      const hasSelectionChanges = changes.some((c) => c.type === 'select');
      if (hasSelectionChanges) {
        const selectedNodeIds = new Set(
          changes.filter((c) => c.type === 'select' && c.selected).map((c) => c.id)
        );
        // Update ReactFlow nodes to have only the selected nodes marked as selected
        setReactFlowNodes((nds) =>
          nds.map((n) => ({
            ...n,
            selected: selectedNodeIds.has(n.id),
          }))
        );
      }

      // Apply changes to ReactFlow's internal state
      onNodesChangeInternal(changes as any);

      // Propagate changes to parent
      onNodesChange(changes);
    },
    [onNodesChangeInternal, onNodesChange, setReactFlowNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeInternal(changes);
      onEdgesChange(changes);
    },
    [onEdgesChangeInternal, onEdgesChange]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (onConnect && connection.source && connection.target) {
        onConnect(connection);
      }
    },
    [onConnect]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: ScratchpadNode) => {
      if (onNodeClick) {
        onNodeClick(event, node);
      }
    },
    [onNodeClick]
  );

  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: ScratchpadNode) => {
      if (onNodeDoubleClick) {
        onNodeDoubleClick(event, node);
      }
    },
    [onNodeDoubleClick]
  );

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (onPaneClick) {
        onPaneClick(event);
      }
    },
    [onPaneClick]
  );

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstanceRef.current = instance;
  }, []);

  console.log(reactFlowNodes);

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 300px)' }}>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={handlePaneClick}
        onInit={handleInit}
        nodesConnectable={true}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <Panel position="top-left">
          <div
            style={{
              background: euiTheme.colors.emptyShade,
              padding: '8px',
              borderRadius: '4px',
            }}
          >
            Scratchpad - {nodes.length} node(s), {edges.length} edge(s)
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
