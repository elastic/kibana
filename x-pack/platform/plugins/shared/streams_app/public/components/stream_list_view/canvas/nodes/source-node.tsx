/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The source card (e.g. AWS CloudWatch). Clicking is handled at the canvas
// level (onNodeClick) so the whole card stays draggable.

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { SourceFlowNode, SourceNodeData } from '../types';
import {
  hiddenHandleClassName,
  inflateClassName,
  useAnchorHandleClassName,
  useRaiseOnHoverClassName,
} from '../node-styles';

// Also used by the placement-preview "shadow" node, which passes
// `interactive={false}` so the translucent preview doesn't get the hover raise.
export function SourceNodeContents({
  data,
  onClick,
  interactive = true,
}: {
  data: SourceNodeData;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const raiseOnHoverClassName = useRaiseOnHoverClassName();
  const isClickable = Boolean(onClick);
  return (
    <EuiPanel
      element={isClickable ? 'button' : 'div'}
      hasShadow
      paddingSize="m"
      onClick={
        isClickable
          ? (event: React.MouseEvent) => {
              event.stopPropagation();
              onClick?.();
            }
          : undefined
      }
      className={`${isClickable ? 'nodrag' : ''} ${css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xs};
        width: 204px;
        text-align: left;
        ${isClickable ? 'cursor: pointer;' : ''}
        border-radius: ${euiTheme.border.radius.medium};
      `} ${interactive ? raiseOnHoverClassName : ''}`}
    >
      <div
        className={css`
          display: flex;
          flex-direction: column;
        `}
      >
        <EuiText
          size="xs"
          className={css`
            font-weight: ${euiTheme.font.weight.semiBold};
            color: ${euiTheme.colors.textParagraph};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {data.title}
        </EuiText>
        <EuiText size="xs" color="subdued">
          {data.subtitle}
        </EuiText>
      </div>
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        alignItems="center"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {data.rate}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="success">
            <EuiText size="xs">
              {i18n.translate('xpack.streams.streamsCanvas.healthy', {
                defaultMessage: 'Healthy',
              })}
            </EuiText>
          </EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export const SourceNode = memo(({ data }: NodeProps<SourceFlowNode>) => {
  const anchorHandleClassName = useAnchorHandleClassName();
  // Click-to-open is handled at the canvas level via onNodeClick so the whole
  // card stays draggable. Marking the button body `nodrag` (as the original
  // did) made the source node impossible to move; routing the click through
  // React Flow keeps both behaviours.
  return (
    <div className={inflateClassName}>
      <Handle type="target" position={Position.Left} className={hiddenHandleClassName} />
      <SourceNodeContents data={data} />
      <Handle type="source" position={Position.Right} className={anchorHandleClassName} />
    </div>
  );
});
SourceNode.displayName = 'SourceNode';
