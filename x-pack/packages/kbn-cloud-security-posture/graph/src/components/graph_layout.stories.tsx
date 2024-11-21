/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import { Story } from '@storybook/react';
import { Writable } from '@kbn/utility-types';
import { css } from '@emotion/react';
import type {
  EdgeViewModel,
  LabelNodeViewModel,
  NodeViewModel,
  EntityNodeViewModel,
  GroupNodeViewModel,
} from '.';
import { Graph } from '.';

export default {
  title: 'Components/Graph Components/Graph Layout',
  description: 'CDR - Graph visualization',
  argTypes: {
    interactive: { control: 'boolean', defaultValue: true },
  },
};

interface GraphData {
  nodes: NodeViewModel[];
  edges: EdgeViewModel[];
  interactive: boolean;
}

type EnhancedNodeViewModel =
  | EntityNodeViewModel
  | GroupNodeViewModel
  | (LabelNodeViewModel & { source: string; target: string });

const extractEdges = (
  graphData: EnhancedNodeViewModel[]
): { nodes: NodeViewModel[]; edges: EdgeViewModel[] } => {
  // Process nodes, transform nodes of id in the format of a(source)-b(target) to edges from a to label and from label to b
  // If there are multiple edges from a to b, create a parent node and group the labels under it. The parent node will be a group node.
  // Connect from a to the group node and from the group node to all the labels. and from the labels to the group again and from the group to b.
  const nodesMetadata: { [key: string]: { edgesIn: number; edgesOut: number } } = {};
  const edgesMetadata: {
    [key: string]: { source: string; target: string; edgesStacked: number; edges: string[] };
  } = {};
  const labelsMetadata: {
    [key: string]: { source: string; target: string; labelsNodes: LabelNodeViewModel[] };
  } = {};
  const nodes: { [key: string]: NodeViewModel } = {};
  const edges: EdgeViewModel[] = [];

  graphData.forEach((node) => {
    if (node.shape === 'label') {
      const labelNode: LabelNodeViewModel = { ...node, id: `${node.id}label(${node.label})` };
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
      const groupNode: NodeViewModel = {
        id: `grp(a(${edge.source})-b(${edge.target}))`,
        shape: 'group',
      };

      nodes[groupNode.id] = groupNode;
      edges.push({
        id: `a(${edge.source})-b(${groupNode.id})`,
        source: edge.source,
        sourceShape: nodes[edge.source].shape,
        target: groupNode.id,
        targetShape: groupNode.shape,
        color: edge.labelsNodes[0].color,
      });

      edges.push({
        id: `a(${groupNode.id})-b(${edge.target})`,
        source: groupNode.id,
        sourceShape: groupNode.shape,
        target: edge.target,
        targetShape: nodes[edge.target].shape,
        color: edge.labelsNodes[0].color,
      });

      edge.labelsNodes.forEach((labelNode: Writable<LabelNodeViewModel>) => {
        labelNode.parentId = groupNode.id;

        edges.push({
          id: `a(${groupNode.id})-b(${labelNode.id})`,
          source: groupNode.id,
          sourceShape: groupNode.shape,
          target: labelNode.id,
          targetShape: labelNode.shape,
          color: labelNode.color,
        });

        edges.push({
          id: `a(${labelNode.id})-b(${groupNode.id})`,
          source: labelNode.id,
          sourceShape: labelNode.shape,
          target: groupNode.id,
          targetShape: groupNode.shape,
          color: labelNode.color,
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
      });

      edges.push({
        id: `a(${edge.labelsNodes[0].id})-b(${edge.target})`,
        source: edge.labelsNodes[0].id,
        sourceShape: edge.labelsNodes[0].shape,
        target: edge.target,
        targetShape: nodes[edge.target].shape,
        color: edge.labelsNodes[0].color,
      });
    }
  });

  // Reversing order, groups like to be first in order :D
  return { nodes: Object.values(nodes).reverse(), edges };
};

const Template: Story<GraphData> = ({ nodes, edges, interactive }: GraphData) => {
  return (
    <ThemeProvider theme={{ darkMode: false }}>
      <Graph
        css={css`
          height: 100%;
          width: 100%;
        `}
        nodes={nodes}
        edges={edges}
        interactive={interactive ?? true}
      />
    </ThemeProvider>
  );
};

export const SimpleAPIMock = Template.bind({});
SimpleAPIMock.args = {
  nodes: [
    {
      id: 'admin@example.com',
      label: 'admin@example.com',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
    },
    {
      id: 'projects/your-project-id/roles/customRole',
      label: 'projects/your-project-id/roles/customRole',
      color: 'primary',
      shape: 'hexagon',
      icon: 'questionInCircle',
    },
    {
      id: 'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
      label: 'google.iam.admin.v1.CreateRole',
      source: 'admin@example.com',
      target: 'projects/your-project-id/roles/customRole',
      color: 'primary',
      shape: 'label',
    },
  ],
  edges: [
    {
      id: 'a(admin@example.com)-b(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))',
      source: 'admin@example.com',
      sourceShape: 'ellipse',
      target:
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
      targetShape: 'label',
      color: 'primary',
    },
    {
      id: 'a(a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole))-b(projects/your-project-id/roles/customRole)',
      source:
        'a(admin@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)',
      sourceShape: 'label',
      target: 'projects/your-project-id/roles/customRole',
      targetShape: 'hexagon',
      color: 'primary',
    },
  ],
};

export const GroupWithWarningAPIMock = Template.bind({});
GroupWithWarningAPIMock.args = {
  nodes: [
    {
      id: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
      shape: 'group',
    },
    {
      id: 'admin3@example.com',
      label: 'admin3@example.com',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
    },
    {
      id: 'projects/your-project-id/roles/customRole',
      label: 'projects/your-project-id/roles/customRole',
      color: 'primary',
      shape: 'hexagon',
      icon: 'questionInCircle',
    },
    {
      id: 'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(failed)',
      label: 'google.iam.admin.v1.CreateRole',
      source: 'admin3@example.com',
      target: 'projects/your-project-id/roles/customRole',
      color: 'warning',
      shape: 'label',
      parentId: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
    },
    {
      id: 'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success)',
      label: 'google.iam.admin.v1.CreateRole',
      source: 'admin3@example.com',
      target: 'projects/your-project-id/roles/customRole',
      color: 'primary',
      shape: 'label',
      parentId: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
    },
  ],
  edges: [
    {
      id: 'a(admin3@example.com)-b(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))',
      source: 'admin3@example.com',
      sourceShape: 'ellipse',
      target: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
      targetShape: 'group',
      color: 'primary',
    },
    {
      id: 'a(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))-b(projects/your-project-id/roles/customRole)',
      source: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
      sourceShape: 'group',
      target: 'projects/your-project-id/roles/customRole',
      targetShape: 'hexagon',
      color: 'primary',
    },
    {
      id: 'a(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))-b(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(failed))',
      source: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
      sourceShape: 'group',
      target:
        'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(failed)',
      targetShape: 'label',
      color: 'warning',
    },
    {
      id: 'a(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(failed))-b(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))',
      source:
        'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(failed)',
      sourceShape: 'label',
      target: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
      targetShape: 'group',
      color: 'warning',
    },
    {
      id: 'a(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))-b(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success))',
      source: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
      sourceShape: 'group',
      target:
        'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success)',
      targetShape: 'label',
      color: 'primary',
    },
    {
      id: 'a(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success))-b(grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole)))',
      source:
        'a(admin3@example.com)-b(projects/your-project-id/roles/customRole)label(google.iam.admin.v1.CreateRole)outcome(success)',
      sourceShape: 'label',
      target: 'grp(a(admin3@example.com)-b(projects/your-project-id/roles/customRole))',
      targetShape: 'group',
      color: 'primary',
    },
  ],
};

export const LargeGraph = Template.bind({});
const baseGraph: EnhancedNodeViewModel[] = [
  {
    id: 'siem-windows',
    label: '',
    color: 'danger',
    shape: 'hexagon',
    icon: 'storage',
  },
  {
    id: '213.180.204.3',
    label: 'IP: 213.180.204.3',
    color: 'danger',
    shape: 'diamond',
    icon: 'globe',
  },
  {
    id: 'user',
    label: '',
    color: 'danger',
    shape: 'ellipse',
    icon: 'user',
  },
  {
    id: 'oktauser',
    label: 'pluni@elastic.co',
    color: 'primary',
    shape: 'ellipse',
    icon: 'user',
  },
  {
    id: 'hackeruser',
    label: 'Hacker',
    color: 'primary',
    shape: 'ellipse',
    icon: 'user',
  },
  {
    id: 's3',
    label: 'Customer PII Data',
    color: 'primary',
    shape: 'rectangle',
    icon: 'aws_s3',
  },
  {
    id: 'ec2',
    label: 'AWS::EC2',
    color: 'primary',
    shape: 'rectangle',
    icon: 'aws_ec2',
  },
  {
    id: 'aws',
    label: 'AWS CloudTrail',
    color: 'primary',
    shape: 'rectangle',
    icon: 'aws',
  },
  {
    id: 'a(siem-windows)-b(user)',
    source: 'siem-windows',
    target: 'user',
    label: 'User login to OKTA',
    color: 'danger',
    shape: 'label',
  },
  {
    id: 'a(213.180.204.3)-b(user)',
    source: '213.180.204.3',
    target: 'user',
    label: 'User login to OKTA',
    color: 'danger',
    shape: 'label',
  },
  {
    id: 'a(user)-b(oktauser)',
    source: 'user',
    target: 'oktauser',
    label: 'user.authentication.sso',
    color: 'primary',
    shape: 'label',
  },
  {
    id: 'a(user)-b(oktauser)',
    source: 'user',
    target: 'oktauser',
    label: 'AssumeRoleWithSAML',
    color: 'primary',
    shape: 'label',
  },
  {
    id: 'a(oktauser)-b(hackeruser)',
    source: 'oktauser',
    target: 'hackeruser',
    label: 'CreateUser',
    color: 'primary',
    shape: 'label',
  },
  {
    id: 'a(oktauser)-b(s3)',
    source: 'oktauser',
    target: 's3',
    label: 'PutObject',
    color: 'primary',
    shape: 'label',
  },
  {
    id: 'a(oktauser)-b(ec2)',
    source: 'oktauser',
    target: 'ec2',
    label: 'RunInstances',
    color: 'primary',
    shape: 'label',
  },
  {
    id: 'a(oktauser)-b(aws)',
    source: 'oktauser',
    target: 'aws',
    label: 'DeleteTrail (Failed)',
    color: 'warning',
    shape: 'label',
  },
];

LargeGraph.args = {
  ...extractEdges(baseGraph),
};

export const GraphLabelOverlayCases = Template.bind({});

GraphLabelOverlayCases.args = {
  ...extractEdges([
    ...baseGraph,
    {
      id: 'newnode',
      label: 'New Node',
      color: 'primary',
      shape: 'ellipse',
      icon: 'user',
    },
    {
      id: 'a(newnode)-b(hackeruser)',
      source: 'newnode',
      target: 'hackeruser',
      label: 'Overlay Label',
      color: 'danger',
      shape: 'label',
    },
    {
      id: 'a(newnode)-b(s3)',
      source: 'newnode',
      target: 's3',
      label: 'Overlay Label',
      color: 'danger',
      shape: 'label',
    },
  ]),
};

export const GraphStackedEdgeCases = Template.bind({});

GraphStackedEdgeCases.args = {
  ...extractEdges([
    ...baseGraph,
    {
      id: 'a(oktauser)-b(hackeruser)',
      source: 'oktauser',
      target: 'hackeruser',
      label: 'CreateUser2',
      color: 'primary',
      shape: 'label',
    },
    {
      id: 'a(siem-windows)-b(user)',
      source: 'siem-windows',
      target: 'user',
      label: 'User login to OKTA2',
      color: 'danger',
      shape: 'label',
    },
  ]),
};
