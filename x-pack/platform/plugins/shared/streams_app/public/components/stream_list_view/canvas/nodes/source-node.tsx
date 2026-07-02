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
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { SourceFlowNode, SourceNodeData } from '../types';
import {
  hiddenHandleClassName,
  inflateClassName,
  useAnchorHandleClassName,
  useRaiseOnHoverClassName,
} from '../node-styles';

// Default heading icon when a source doesn't specify its own logo.
const DEFAULT_SOURCE_ICON = 'logoElastic';

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
      paddingSize="none"
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
        padding: ${euiTheme.size.m};
        text-align: left;
        ${isClickable ? 'cursor: pointer;' : ''}
        border-radius: ${euiTheme.border.radius.medium};
      `} ${interactive ? raiseOnHoverClassName : ''}`}
    >
      {/* Heading: a small logo badge (subtle circle) alongside the source name. */}
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <div
            className={css`
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2px;
              border-radius: 50%;
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            `}
          >
            <EuiIcon type={data.icon ?? DEFAULT_SOURCE_ICON} size="s" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem
          className={css`
            min-width: 0;
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
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        {data.subtitle}
      </EuiText>
      {/* Stats: throughput and health, grouped together on the left. */}
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {data.rate}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="success">
            <EuiText
              size="xs"
              className={css`
                color: ${euiTheme.colors.textSuccess};
              `}
            >
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
