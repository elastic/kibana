/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FlowNode } from '@kbn/streams-plugin/common';
import { HealthPill } from '../badges/health_pill';

type PrometheusScraperNodeData = Extract<FlowNode, { kind: 'prometheusScraper' }>;
type PrometheusScraperNodeType = Node<PrometheusScraperNodeData, 'prometheusScraper'>;

const nodeStyles = css`
  width: 200px;
`;

const handleStyles = css`
  visibility: hidden;
`;

const truncate = (str: string, maxLen: number): string =>
  str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;

export const PrometheusScraperNode = memo(
  ({ data, selected }: NodeProps<PrometheusScraperNodeType>) => {
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
            <EuiIcon type="logoMetrics" size="s" aria-hidden="true" />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText
              size="xs"
              style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
            >
              <strong>{data.label}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          style={{ marginTop: 4 }}
        >
          <EuiFlexItem grow>
            <EuiText size="xs" color="subdued">
              {truncate(data.targetHost, 22)}
            </EuiText>
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

PrometheusScraperNode.displayName = 'PrometheusScraperNode';
