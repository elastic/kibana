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
import { formatRate } from '../edges/throughput_edge';

type CloudPipelineNodeData = Extract<FlowNode, { kind: 'cloudPipeline' }>;
type CloudPipelineNodeType = Node<CloudPipelineNodeData, 'cloudPipeline'>;

const nodeStyles = css`
  width: 200px;
`;

const handleStyles = css`
  visibility: hidden;
`;

export const CloudPipelineNode = memo(({ data, selected }: NodeProps<CloudPipelineNodeType>) => {
  const isDegraded = data.health?.status === 'degraded' || data.health?.status === 'down';

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
            <strong>{data.label}</strong>
          </EuiText>
        </EuiFlexItem>
        {isDegraded && (
          <EuiFlexItem grow={false}>
            <EuiIcon
              type="warning"
              size="s"
              color="warning"
              aria-label={i18n.translate('xpack.streams.ingestFlow.cloudPipelineNode.degraded', {
                defaultMessage: 'Pipeline degraded',
              })}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} style={{ marginTop: 4 }}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('xpack.streams.ingestFlow.cloudPipelineNode.otlpBadge', {
              defaultMessage: 'OTLP',
            })}
          </EuiBadge>
        </EuiFlexItem>
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
      <Handle type="source" position={Position.Right} css={handleStyles} />
    </EuiPanel>
  );
});

CloudPipelineNode.displayName = 'CloudPipelineNode';
