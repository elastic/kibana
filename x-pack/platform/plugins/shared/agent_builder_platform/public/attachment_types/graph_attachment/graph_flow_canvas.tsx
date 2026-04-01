/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type ColorMode,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

interface GraphNodeData {
  label: string;
  icon?: string;
  [key: string]: unknown;
}

const IconNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        padding: ${euiTheme.size.xs} ${euiTheme.size.m};
        background: ${euiTheme.colors.backgroundBasePlain};
        border: 2px solid ${euiTheme.colors.borderBaseSubdued};
        border-radius: ${euiTheme.border.radius.medium};
        font-size: ${euiTheme.size.m};
        font-weight: ${euiTheme.font.weight.medium};
        color: ${euiTheme.colors.textParagraph};
        min-width: 100px;
        white-space: nowrap;
      `}
    >
      <Handle type="target" position={Position.Left} css={handleStyle} />
      {data.icon && <EuiIcon type={data.icon} size="m" color="subdued" aria-hidden={true} />}
      <span>{data.label}</span>
      <Handle type="source" position={Position.Right} css={handleStyle} />
    </div>
  );
};

const GroupNode: React.FC<NodeProps<Node<GraphNodeData>>> = ({ data }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        width: 100%;
        height: 100%;
        background: ${euiTheme.colors.backgroundBaseSubdued};
        border: 2px dashed ${euiTheme.colors.borderBaseSubdued};
        border-radius: ${euiTheme.border.radius.medium};
        padding: ${euiTheme.size.s};
      `}
    >
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
          font-size: ${euiTheme.size.m};
          font-weight: ${euiTheme.font.weight.semiBold};
          color: ${euiTheme.colors.textSubdued};
          padding-bottom: ${euiTheme.size.xs};
        `}
      >
        {data.icon && <EuiIcon type={data.icon} size="s" color="subdued" aria-hidden={true} />}
        <span>{data.label}</span>
      </div>
    </div>
  );
};

const handleStyle = css`
  opacity: 0;
  width: 1px;
  height: 1px;
`;

const nodeTypes = {
  default: IconNode,
  group: GroupNode,
};

interface GraphFlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  colorMode: string;
}

export const GraphFlowCanvas: React.FC<GraphFlowCanvasProps> = ({ nodes, edges, colorMode }) => {
  const styledEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        style: { strokeWidth: 1.5, ...edge.style },
      })),
    [edges]
  );

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          nodes,
          padding: 0.2,
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
