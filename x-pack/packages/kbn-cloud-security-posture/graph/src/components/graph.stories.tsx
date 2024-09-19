/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ThemeProvider } from '@emotion/react';
import { ReactFlow, Controls, Background } from '@xyflow/react';
import { Story } from '@storybook/react';
import {
  type NodeData,
  HexagonNode,
  PentagonNode,
  EllipseNode,
  RectangleNode,
  DiamondNode,
} from './node';
import { type EdgeData, CustomPathEdge } from './edge';

import '@xyflow/react/dist/style.css';
import { SvgDefsMarker } from './edge/styles';
import { GraphMetadata } from '.';

export default {
  title: 'Components/Graph Components',
  description: 'CDR - Graph visualization',
};

const nodeTypes = {
  hexagon: HexagonNode,
  pentagon: PentagonNode,
  ellipse: EllipseNode,
  rectangle: RectangleNode,
  diamond: DiamondNode,
};

const edgeTypes = {
  default: CustomPathEdge,
};

interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
  interactive: boolean;
}

const generateGraphMetadata = (args: GraphData): GraphMetadata => {
  const nodesMetadata: { [key: string]: { edgesIn: number; edgesOut: number } } = {};
  const edgesMetadata: {
    [key: string]: { source: string; target: string; edgesStacked: number; edges: string[] };
  } = {};
  args.nodes.forEach((node) => {
    nodesMetadata[node.id] = { edgesIn: 0, edgesOut: 0 };
  });

  args.edges.forEach((edge) => {
    nodesMetadata[edge.source].edgesOut += 1;
    nodesMetadata[edge.target].edgesIn += 1;
    const edgeId = `edge-${edge.source}-${edge.target}`;

    if (edgesMetadata[edgeId]) {
      edgesMetadata[edgeId].edgesStacked += 1;
      edgesMetadata[edgeId].edges.push(edge.id);
    } else {
      edgesMetadata[edgeId] = {
        source: edge.source,
        target: edge.target,
        edgesStacked: 1,
        edges: [edge.id],
      };
    }
  });

  return {
    nodes: nodesMetadata,
    edges: edgesMetadata,
  };
};

const Template: Story<GraphData> = (args: GraphData) => {
  const graphMetadata: GraphMetadata = useMemo(() => generateGraphMetadata(args), [args]);

  return (
    <ThemeProvider theme={{ darkMode: false }}>
      <SvgDefsMarker />
      <ReactFlow
        fitView
        attributionPosition={undefined}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodes={args.nodes.map((nodeData) => ({
          id: nodeData.id,
          type: nodeData.shape,
          data: { ...nodeData },
          position: nodeData.position,
        }))}
        edges={args.edges.map((edgeData) => ({
          id: edgeData.id,
          type: 'default',
          label: edgeData.label,
          source: edgeData.source,
          target: edgeData.target,
          data: { ...edgeData, graphMetadata },
        }))}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </ThemeProvider>
  );
};

export const Graph = Template.bind({});

Graph.args = {
  nodes: [
    {
      id: 'siem-windows',
      label: '',
      color: 'danger',
      shape: 'hexagon',
      icon: 'storage',
      position: { x: 0, y: 0 },
      interactive: true,
    },
    {
      id: '213.180.204.3',
      label: 'IP: 213.180.204.3',
      color: 'danger',
      shape: 'diamond',
      icon: 'globe',
      position: { x: 0, y: 300 },
      interactive: true,
    },
    {
      id: 'user',
      label: '',
      color: 'danger',
      shape: 'ellipse',
      icon: 'user',
      position: { x: 300, y: 150 },
      interactive: true,
    },
    {
      id: 'oktauser',
      label: 'pluni@elastic.co',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      position: { x: 600, y: 150 },
      interactive: true,
    },
    {
      id: 'hackeruser',
      label: 'Hacker',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      position: { x: 900, y: -75 },
      interactive: true,
    },
    {
      id: 's3',
      label: 'Customer PII Data',
      color: 'primary',
      shape: 'rectangle',
      icon: 'aws_s3',
      position: { x: 900, y: 75 },
      interactive: true,
    },
    {
      id: 'ec2',
      label: 'AWS::EC2',
      color: 'primary',
      shape: 'rectangle',
      icon: 'aws_ec2',
      position: { x: 900, y: 225 },
      interactive: true,
    },
    {
      id: 'aws',
      label: 'AWS CloudTrail',
      color: 'primary',
      shape: 'rectangle',
      icon: 'aws',
      position: { x: 900, y: 375 },
      interactive: true,
    },
  ],
  edges: [
    {
      id: 'siem-windows-user',
      source: 'siem-windows',
      sourceShape: 'hexagon',
      target: 'user',
      targetShape: 'ellipse',
      label: 'User login to OKTA',
      color: 'danger',
      interactive: true,
    },
    {
      id: '213.180.204.3-user',
      source: '213.180.204.3',
      sourceShape: 'diamond',
      target: 'user',
      targetShape: 'ellipse',
      label: 'User login to OKTA',
      color: 'danger',
      interactive: true,
    },
    {
      id: 'user-oktauser1',
      source: 'user',
      sourceShape: 'ellipse',
      target: 'oktauser',
      targetShape: 'ellipse',
      label: 'user.authentication.sso',
      color: 'primary',
      interactive: true,
    },
    {
      id: 'user-oktauser2',
      source: 'user',
      sourceShape: 'ellipse',
      target: 'oktauser',
      targetShape: 'ellipse',
      label: 'AssumeRoleWithSAML',
      color: 'primary',
      interactive: true,
    },
    {
      id: 'oktauser-hackeruser',
      source: 'oktauser',
      sourceShape: 'ellipse',
      target: 'hackeruser',
      targetShape: 'ellipse',
      label: 'CreateUser',
      color: 'primary',
      interactive: true,
    },
    {
      id: 'oktauser-s3',
      source: 'oktauser',
      sourceShape: 'ellipse',
      target: 's3',
      targetShape: 'rectangle',
      label: 'PutObject',
      color: 'primary',
      interactive: true,
    },
    {
      id: 'oktauser-ec2',
      source: 'oktauser',
      sourceShape: 'ellipse',
      target: 'ec2',
      targetShape: 'rectangle',
      label: 'RunInstances',
      color: 'primary',
      interactive: true,
    },
    {
      id: 'oktauser-aws',
      source: 'oktauser',
      sourceShape: 'ellipse',
      target: 'aws',
      targetShape: 'rectangle',
      label: 'DeleteTrail (Failed)',
      color: 'warning',
      interactive: true,
    },
  ],
};

export const GraphLabelOverlayCases = Template.bind({});

GraphLabelOverlayCases.args = {
  nodes: [
    ...(Graph.args.nodes || []),
    {
      id: 'newnode',
      label: 'New Node',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      position: { x: 600, y: 0 },
      interactive: true,
    },
  ],
  edges: [
    ...(Graph.args.edges || []),
    {
      id: 'newedge',
      source: 'newnode',
      sourceShape: 'ellipse',
      target: 'hackeruser',
      targetShape: 'ellipse',
      label: 'Overlay Label',
      color: 'danger',
      interactive: true,
    },
    {
      id: 'newedge2',
      source: 'newnode',
      sourceShape: 'ellipse',
      target: 's3',
      targetShape: 'rectangle',
      label: 'Overlay Label',
      color: 'danger',
      interactive: true,
    },
  ],
};

export const GraphStackedEdgeCases = Template.bind({});

GraphStackedEdgeCases.args = {
  nodes: [...(Graph.args.nodes || [])],
  edges: [
    ...(Graph.args.edges || []),
    {
      id: 'oktauser-hackeruser2',
      source: 'oktauser',
      sourceShape: 'ellipse',
      target: 'hackeruser',
      targetShape: 'ellipse',
      label: 'CreateUser2',
      color: 'primary',
      interactive: true,
    },
    {
      id: 'siem-windows-user2',
      source: 'siem-windows',
      sourceShape: 'hexagon',
      target: 'user',
      targetShape: 'ellipse',
      label: 'User login to OKTA2',
      color: 'danger',
      interactive: true,
    },
  ],
};
