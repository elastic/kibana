/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { FlowNode } from '@kbn/streams-plugin/common';

type AgentPolicyNodeData = Extract<FlowNode, { kind: 'agentPolicy' }>;
type AgentPolicyNodeType = Node<AgentPolicyNodeData, 'agentPolicy'>;

const nodeStyles = css`
  width: 240px;
`;

const handleStyles = css`
  visibility: hidden;
`;

export const AgentPolicyGroupNode = memo(({ data, selected }: NodeProps<AgentPolicyNodeType>) => {
  return (
    <EuiPanel
      color="subdued"
      paddingSize="s"
      hasBorder
      borderRadius="m"
      css={[
        nodeStyles,
        css`
          outline: ${selected ? '2px solid currentColor' : 'none'};
          outline-offset: -1px;
        `,
      ]}
    >
      <Handle type="target" position={Position.Left} css={handleStyles} />
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{data.label}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.streams.ingestFlow.agentPolicyNode.agentCount', {
              defaultMessage: '{count} {count, plural, one {agent} other {agents}}',
              values: { count: data.agentCount },
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Handle type="source" position={Position.Right} css={handleStyles} />
    </EuiPanel>
  );
});

AgentPolicyGroupNode.displayName = 'AgentPolicyGroupNode';
