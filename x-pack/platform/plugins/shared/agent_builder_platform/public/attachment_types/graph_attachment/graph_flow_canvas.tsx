/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type ColorMode,
  type Edge,
  type Node,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

interface GraphFlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  colorMode: string;
}

export const GraphFlowCanvas: React.FC<GraphFlowCanvasProps> = ({ nodes, edges, colorMode }) => {
  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{
          nodes,
        }}
        minZoom={0.1}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        colorMode={colorMode.toLowerCase() as ColorMode}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </ReactFlowProvider>
  );
};
