/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SourceNode as SourceNodeType } from '../types';
import { getNodeCardStyles } from './node_card_styles';

const SOURCE_NODE_WIDTH = 207;

export function SourceNode({ data, selected, dragging }: NodeProps<SourceNodeType>) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj="streamsCanvasSourceNode"
        css={getNodeCardStyles(euiTheme, { width: SOURCE_NODE_WIDTH, selected, dragging })}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiPanel
              hasShadow={false}
              hasBorder
              paddingSize="none"
              color="subdued"
              css={css`
                display: flex;
                align-items: center;
                justify-content: center;
                padding: ${euiTheme.size.xs};
              `}
            >
              <EuiIcon type={data.iconType} size="s" />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem
            grow
            css={css`
              overflow: hidden;
            `}
          >
            <EuiText size="xs">
              <strong>{data.title}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              {data.subtitle}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </>
  );
}
