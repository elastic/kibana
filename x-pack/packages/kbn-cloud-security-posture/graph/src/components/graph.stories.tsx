/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import { minBy } from 'lodash';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Position,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import { Story } from '@storybook/react';
import {
  type NodeData,
  HexagonNode,
  PentagonNode,
  EllipseNode,
  RectangleNode,
  DiamondNode,
  LabelNode,
  EdgeGroupNode,
  LabelNodeData,
} from './node';
import { type EdgeData, DefaultEdge } from './edge';

import '@xyflow/react/dist/style.css';
import { SvgDefsMarker } from './edge/styles';
import { GroupStyleOverride } from './node/styles';
import { layoutGraph } from './graph/layout_graph';

export default {
  title: 'Components/Graph Components/Default Edge',
  description: 'CDR - Graph visualization',
};

const nodeTypes = {
  hexagon: HexagonNode,
  pentagon: PentagonNode,
  ellipse: EllipseNode,
  rectangle: RectangleNode,
  diamond: DiamondNode,
  label: LabelNode,
  group: EdgeGroupNode,
};

const edgeTypes = {
  default: DefaultEdge,
};

interface GraphData {
  nodes: NodeData[];
  interactive: boolean;
}

const Template: Story<GraphData> = (args: GraphData) => {
  const { initialNodes, initialEdges } = processGraph(args.nodes);

  const [nodesState, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edgesState, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <ThemeProvider theme={{ darkMode: false }}>
      <SvgDefsMarker />
      <ReactFlow
        fitView
        attributionPosition={undefined}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </ThemeProvider>
  );
};

export const Graph = Template.bind({});
const baseGraph: NodeData[] = [
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
  {
    id: 'a(siem-windows)-b(user)',
    source: 'siem-windows',
    target: 'user',
    label: 'User login to OKTA',
    color: 'danger',
    shape: 'label',
    position: { x: 100, y: 33 },
    interactive: true,
  },
  {
    id: 'a(213.180.204.3)-b(user)',
    source: '213.180.204.3',
    target: 'user',
    label: 'User login to OKTA',
    color: 'danger',
    shape: 'label',
    position: { x: 100, y: 333 },
    interactive: true,
  },
  {
    id: 'a(user)-b(oktauser)',
    source: 'user',
    target: 'oktauser',
    label: 'user.authentication.sso',
    color: 'primary',
    shape: 'label',
    position: { x: 415, y: 126 },
    interactive: true,
  },
  {
    id: 'a(user)-b(oktauser)',
    source: 'user',
    target: 'oktauser',
    label: 'AssumeRoleWithSAML',
    color: 'primary',
    shape: 'label',
    position: { x: 415, y: 250 },
    interactive: true,
  },
  {
    id: 'a(oktauser)-b(hackeruser)',
    source: 'oktauser',
    target: 'hackeruser',
    label: 'CreateUser',
    color: 'primary',
    shape: 'label',
    position: { x: 730, y: -75 + 33 },
    interactive: true,
  },
  {
    id: 'a(oktauser)-b(s3)',
    source: 'oktauser',
    target: 's3',
    label: 'PutObject',
    color: 'primary',
    shape: 'label',
    position: { x: 730, y: 75 + 33 },
    interactive: true,
  },
  {
    id: 'a(oktauser)-b(ec2)',
    source: 'oktauser',
    target: 'ec2',
    label: 'RunInstances',
    color: 'primary',
    shape: 'label',
    position: { x: 730, y: 225 + 33 },
    interactive: true,
  },
  {
    id: 'a(oktauser)-b(aws)',
    source: 'oktauser',
    target: 'aws',
    label: 'DeleteTrail (Failed)',
    color: 'warning',
    shape: 'label',
    position: { x: 730, y: 375 + 33 },
    interactive: true,
  },
];

Graph.args = {
  nodes: [...baseGraph],
};

export const GraphLabelOverlayCases = Template.bind({});

GraphLabelOverlayCases.args = {
  nodes: [
    ...baseGraph,
    {
      id: 'newnode',
      label: 'New Node',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
      position: { x: 600, y: 0 },
      interactive: true,
    },
    {
      id: 'a(newnode)-b(hackeruser)',
      source: 'newnode',
      target: 'hackeruser',
      label: 'Overlay Label',
      color: 'danger',
      shape: 'label',
      position: { x: 730, y: 0 + 33 },
      interactive: true,
    },
    {
      id: 'a(newnode)-b(s3)',
      source: 'newnode',
      target: 's3',
      label: 'Overlay Label',
      color: 'danger',
      shape: 'label',
      position: { x: 730, y: 150 + 33 },
      interactive: true,
    },
  ],
};

export const GraphStackedEdgeCases = Template.bind({});

GraphStackedEdgeCases.args = {
  nodes: [
    ...baseGraph,
    {
      id: 'a(oktauser)-b(hackeruser)',
      source: 'oktauser',
      target: 'hackeruser',
      label: 'CreateUser2',
      color: 'primary',
      shape: 'label',
      position: { x: 730, y: 0 },
      interactive: true,
    },
    {
      id: 'a(siem-windows)-b(user)',
      source: 'siem-windows',
      target: 'user',
      label: 'User login to OKTA2',
      color: 'danger',
      shape: 'label',
      position: { x: 100, y: 50 + 33 },
      interactive: true,
    },
  ],
};

if (GraphStackedEdgeCases.args.nodes) {
  GraphStackedEdgeCases.args.nodes[0] = { ...GraphStackedEdgeCases.args.nodes[0] };
  GraphStackedEdgeCases.args.nodes[0].position = {
    ...GraphStackedEdgeCases.args.nodes[0].position,
    y: 25,
  };
  GraphStackedEdgeCases.args.nodes[4] = { ...GraphStackedEdgeCases.args.nodes[4] };
  GraphStackedEdgeCases.args.nodes[4].position = {
    ...GraphStackedEdgeCases.args.nodes[4].position,
    y: -50,
  };
}

function processGraph(graphData: NodeData[]): { initialNodes: Node[]; initialEdges: EdgeData[] } {
  const { nodes, edges } = extractEdges(graphData);
  const nodesById: { [key: string]: NodeData } = {};

  const initialNodes = nodes.map((nodeData) => {
    const node: Node = {
      id: nodeData.id,
      type: nodeData.shape,
      data: { ...nodeData },
      position: nodeData.position,
      draggable: true,
    };

    if (node.type === 'group' && nodeData.shape === 'group') {
      node.sourcePosition = Position.Right;
      node.targetPosition = Position.Left;
      node.resizing = true;
      node.style = GroupStyleOverride(nodeData.size);
    } else if (nodeData.shape === 'label' && nodeData.parentId) {
      node.parentId = nodeData.parentId;
      node.extent = 'parent';
      node.expandParent = true;
      // node.draggable = false;
    }

    nodesById[nodeData.id] = nodeData;
    return node;
  });

  const initialEdges = edges.map((edgeData) => {
    const isIn =
      nodesById[edgeData.source].shape !== 'label' && nodesById[edgeData.target].shape === 'group';
    const isInside =
      nodesById[edgeData.source].shape === 'group' && nodesById[edgeData.target].shape === 'label';
    const isOut =
      nodesById[edgeData.source].shape === 'label' && nodesById[edgeData.target].shape === 'group';
    const isOutside =
      nodesById[edgeData.source].shape === 'group' && nodesById[edgeData.target].shape !== 'label';

    return {
      id: edgeData.id,
      type: 'default',
      label: edgeData.label,
      source: edgeData.source,
      sourceShape: edgeData.sourceShape,
      sourceHandle: isInside ? 'inside' : isOutside ? 'outside' : undefined,
      target: edgeData.target,
      targetShape: edgeData.targetShape,
      targetHandle: isIn ? 'in' : isOut ? 'out' : undefined,
      data: { ...edgeData },
      interactive: false,
    };
  });

  return { initialNodes, initialEdges };
}

const extractEdges = (graphData: NodeData[]): { nodes: NodeData[]; edges: EdgeData[] } => {
  // Process nodes, transform nodes of id in the format of a(source)-b(target) to edges from a to label and from label to b
  // If there are multiple edges from a to b, create a parent node and group the labels under it. The parent node will be a group node.
  // Connect from a to the group node and from the group node to all the labels. and from the labels to the group again and from the group to b.
  const nodesMetadata: { [key: string]: { edgesIn: number; edgesOut: number } } = {};
  const edgesMetadata: {
    [key: string]: { source: string; target: string; edgesStacked: number; edges: string[] };
  } = {};
  const labelsMetadata: {
    [key: string]: { source: string; target: string; labelsNodes: LabelNodeData[] };
  } = {};
  const nodes: { [key: string]: NodeData } = {};
  const edges: EdgeData[] = [];

  graphData.forEach((node) => {
    if (node.shape === 'label') {
      const labelNode = { ...node, id: `${node.id}label(${node.label})` };
      const { source, target } = node;

      if (labelsMetadata[node.id]) {
        labelsMetadata[node.id].labelsNodes.push(labelNode);
      } else {
        labelsMetadata[node.id] = { source, target, labelsNodes: [labelNode] };
      }

      nodes[labelNode.id] = labelNode;

      // Set metadata
      const edgeId = node.id;
      nodesMetadata[source].edgesOut += 1; // TODO: Check if source exists
      nodesMetadata[target].edgesIn += 1; // TODO: Check if target exists

      if (edgesMetadata[edgeId]) {
        edgesMetadata[edgeId].edgesStacked += 1;
        edgesMetadata[edgeId].edges.push(edgeId);
      } else {
        edgesMetadata[edgeId] = {
          source,
          target,
          edgesStacked: 1,
          edges: [labelNode.id],
        };
      }
    } else {
      nodes[node.id] = node;
      nodesMetadata[node.id] = { edgesIn: 0, edgesOut: 0 };
    }
  });

  Object.values(labelsMetadata).forEach((edge) => {
    if (edge.labelsNodes.length > 1) {
      const groupNode: NodeData = {
        id: `grp(a(${edge.source})-b(${edge.target}))`,
        shape: 'group',
        position: {
          x: minBy(edge.labelsNodes, 'position.x')?.position.x ?? 0,
          y: minBy(edge.labelsNodes, 'position.y')?.position.y ?? 0,
        },
        interactive: true,
      };

      nodes[groupNode.id] = groupNode;
      edges.push({
        id: `a(${edge.source})-b(${groupNode.id})`,
        source: edge.source,
        sourceShape: nodes[edge.source].shape,
        target: groupNode.id,
        targetShape: groupNode.shape,
        color: edge.labelsNodes[0].color,
        interactive: true,
      });

      edges.push({
        id: `a(${groupNode.id})-b(${edge.target})`,
        source: groupNode.id,
        sourceShape: groupNode.shape,
        target: edge.target,
        targetShape: nodes[edge.target].shape,
        color: edge.labelsNodes[0].color,
        interactive: true,
      });

      edge.labelsNodes.forEach((labelNode: LabelNodeData) => {
        labelNode.parentId = groupNode.id;

        edges.push({
          id: `a(${groupNode.id})-b(${labelNode.id})`,
          source: groupNode.id,
          sourceShape: groupNode.shape,
          target: labelNode.id,
          targetShape: labelNode.shape,
          color: labelNode.color,
          interactive: true,
        });

        edges.push({
          id: `a(${labelNode.id})-b(${groupNode.id})`,
          source: labelNode.id,
          sourceShape: labelNode.shape,
          target: groupNode.id,
          targetShape: groupNode.shape,
          color: labelNode.color,
          interactive: true,
        });
      });
    } else {
      edges.push({
        id: `a(${edge.source})-b(${edge.labelsNodes[0].id})`,
        source: edge.source,
        sourceShape: nodes[edge.source].shape,
        target: edge.labelsNodes[0].id,
        targetShape: edge.labelsNodes[0].shape,
        color: edge.labelsNodes[0].color,
        interactive: true,
      });

      edges.push({
        id: `a(${edge.labelsNodes[0].id})-b(${edge.target})`,
        source: edge.labelsNodes[0].id,
        sourceShape: edge.labelsNodes[0].shape,
        target: edge.target,
        targetShape: nodes[edge.target].shape,
        color: edge.labelsNodes[0].color,
        interactive: true,
      });
    }
  });

  layoutGraph(Object.values(nodes), { nodes: nodesMetadata, edges: edgesMetadata });

  // Reversing order, groups like to be first in order :D
  return { nodes: Object.values(nodes).reverse(), edges };
};
