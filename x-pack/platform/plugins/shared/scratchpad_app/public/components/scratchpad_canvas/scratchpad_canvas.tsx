/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
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
}

export function ScratchpadCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}: ScratchpadCanvasProps) {
  const { euiTheme } = useEuiTheme();
  const [reactFlowNodes, setReactFlowNodes, onNodesChangeInternal] = useNodesState(nodes);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChangeInternal] = useEdgesState(edges);

  // Sync external nodes/edges with ReactFlow state
  React.useEffect(() => {
    setReactFlowNodes(nodes);
  }, [nodes, setReactFlowNodes]);

  React.useEffect(() => {
    setReactFlowEdges(edges);
  }, [edges, setReactFlowEdges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes as any);
      onNodesChange(changes);
    },
    [onNodesChangeInternal, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeInternal(changes);
      onEdgesChange(changes);
    },
    [onEdgesChangeInternal, onEdgesChange]
  );

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
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
