/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import {
  ReactFlow,
  Controls,
  Background,
  Position,
  Handle,
  useNodesState,
  useEdgesState,
  type BuiltInNode,
  type NodeProps,
} from '@xyflow/react';
import { Story } from '@storybook/react';
import { SvgDefsMarker } from './styles';
import { type EdgeData, CustomPathEdge } from '.';

import '@xyflow/react/dist/style.css';

export default {
  title: 'Components/Graph Components',
  description: 'CDR - Graph visualization',
  argTypes: {
    color: {
      options: ['primary', 'danger', 'warning'],
      control: { type: 'radio' },
    },
  },
};

const nodeTypes = {
  default: ((props: NodeProps<BuiltInNode>) => {
    const handleStyle = {
      width: 0,
      height: 0,
      'min-width': 0,
      'min-height': 0,
      border: 'none',
    };
    return (
      <div>
        <Handle type="source" position={Position.Right} style={handleStyle} />
        <Handle type="target" position={Position.Left} style={handleStyle} />
        {props.data.label}
      </div>
    );
  }) as React.FC<NodeProps<BuiltInNode>>,
};

const edgeTypes = {
  default: CustomPathEdge,
};

const Template: Story<EdgeData> = (args: EdgeData) => {
  const initialNodes = [
    {
      id: 'source',
      type: 'default',
      data: { label: 'source' },
      position: { x: 0, y: 0 },
      draggable: true,
    },
    {
      id: 'target',
      type: 'default',
      data: { label: 'target' },
      position: { x: 320, y: 100 },
      draggable: true,
    },
  ];

  const initialEdges = [
    {
      id: args.id,
      source: 'source',
      target: 'target',
      label: args.label,
      data: args,
      type: 'default',
    },
  ];

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <ThemeProvider theme={{ darkMode: false }}>
      <SvgDefsMarker />
      <ReactFlow
        fitView
        attributionPosition={undefined}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodes={nodes}
        edges={edges}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </ThemeProvider>
  );
};

export const Edge = Template.bind({});

Edge.args = {
  id: 'siem-windows',
  label: 'User login to OKTA',
  color: 'primary',
  icon: 'okta',
  interactive: true,
};
