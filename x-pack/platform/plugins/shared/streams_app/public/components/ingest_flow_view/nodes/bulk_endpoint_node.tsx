/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { FlowNode } from '@kbn/streams-plugin/common';

type BulkEndpointNodeData = Extract<FlowNode, { kind: 'bulkEndpoint' }>;
type BulkEndpointNodeType = Node<BulkEndpointNodeData, 'bulkEndpoint'>;

const nodeStyles = css`
  width: 200px;
`;

const handleStyles = css`
  visibility: hidden;
`;

export const BulkEndpointNode = memo(({ selected }: NodeProps<BulkEndpointNodeType>) => {
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
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.streams.ingestFlow.bulkEndpointNode.title', {
                defaultMessage: 'Elasticsearch',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiCode>_bulk</EuiCode>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.ingestFlow.bulkEndpointNode.subtitle', {
                  defaultMessage: 'endpoint',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Handle type="source" position={Position.Right} css={handleStyles} />
    </EuiPanel>
  );
});

BulkEndpointNode.displayName = 'BulkEndpointNode';
