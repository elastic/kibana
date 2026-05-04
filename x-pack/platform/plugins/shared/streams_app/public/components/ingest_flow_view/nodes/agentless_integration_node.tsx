/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { FlowNode } from '@kbn/streams-plugin/common';
import { HealthPill } from '../badges/health_pill';

type AgentlessIntegrationNodeData = Extract<FlowNode, { kind: 'agentlessIntegration' }>;
type AgentlessIntegrationNodeType = Node<AgentlessIntegrationNodeData, 'agentlessIntegration'>;

const nodeStyles = css`
  width: 200px;
`;

const handleStyles = css`
  visibility: hidden;
`;

export const AgentlessIntegrationNode = memo(
  ({ data, selected }: NodeProps<AgentlessIntegrationNodeType>) => {
    return (
      <EuiPanel
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
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="cloud" size="s" aria-hidden="true" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText
              size="xs"
              style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
            >
              <strong>{data.packageTitle}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          style={{ marginTop: 4 }}
        >
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.streams.ingestFlow.agentlessNode.agentlessBadge', {
                defaultMessage: 'agentless',
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {data.health ? <HealthPill status={data.health.status} /> : null}
          </EuiFlexItem>
        </EuiFlexGroup>
        <Handle type="source" position={Position.Right} css={handleStyles} />
      </EuiPanel>
    );
  }
);

AgentlessIntegrationNode.displayName = 'AgentlessIntegrationNode';
