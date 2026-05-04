/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { FlowNode } from '@kbn/streams-plugin/common';
import { HealthPill } from '../badges/health_pill';
import { formatRate } from '../edges/throughput_edge';

type WiredStreamNodeData = Extract<FlowNode, { kind: 'wiredStream' }>;
type WiredStreamNodeType = Node<WiredStreamNodeData, 'wiredStream'>;

const nodeStyles = css`
  width: 200px;
`;

const handleStyles = css`
  visibility: hidden;
`;

const getFailureLabel = (docsPerSec: number): string => {
  const n = docsPerSec < 1000 ? `${Math.round(docsPerSec)}` : `${(docsPerSec / 1000).toFixed(1)}k`;
  return `⚠ ${n}/s`;
};

export const WiredStreamNode = memo(({ data, selected }: NodeProps<WiredStreamNodeType>) => {
  const hasFailures = (data.failureRate?.docsPerSec ?? 0) > 0;

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
        <EuiFlexItem grow>
          <EuiText
            size="xs"
            style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
          >
            <strong>{data.streamName}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="primary">
            {i18n.translate('xpack.streams.ingestFlow.wiredStreamNode.wiredBadge', {
              defaultMessage: 'WIRED',
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} style={{ marginTop: 4 }}>
        <EuiFlexItem grow>
          {data.throughput ? (
            <EuiText size="xs" color="subdued">
              {formatRate(data.throughput.docsPerSec)}
            </EuiText>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {data.health ? <HealthPill status={data.health.status} /> : null}
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasFailures && data.failureRate ? (
        <div style={{ marginTop: 4 }}>
          <EuiBadge color="danger">{getFailureLabel(data.failureRate.docsPerSec)}</EuiBadge>
          <EuiText size="xs" color="danger" style={{ display: 'inline', marginLeft: 4 }}>
            {i18n.translate('xpack.streams.ingestFlow.wiredStreamNode.failingLabel', {
              defaultMessage: 'failing',
            })}
          </EuiText>
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} css={handleStyles} />
    </EuiPanel>
  );
});

WiredStreamNode.displayName = 'WiredStreamNode';
