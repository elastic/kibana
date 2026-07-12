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
  useRestingShadowClassName,
} from '../node-styles';

// Default heading icon when a source doesn't specify its own logo.
const DEFAULT_SOURCE_ICON = 'logoElastic';
// Generic "not yet configured" glyph for a freshly-placed source, matching the
// dashed/attention treatment used elsewhere for unconfigured nodes.
const UNCONFIGURED_SOURCE_ICON = 'database';

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
  const restingShadowClassName = useRestingShadowClassName();
  const isClickable = Boolean(onClick);
  return (
    <EuiPanel
      element={isClickable ? 'button' : 'div'}
      hasShadow={false}
      paddingSize="none"
      onClick={
        isClickable
          ? (event: React.MouseEvent) => {
              event.stopPropagation();
              onClick?.();
            }
          : undefined
      }
      className={`${isClickable ? 'nodrag' : ''} ${restingShadowClassName} ${css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
        width: 204px;
        padding: ${euiTheme.size.m};
        text-align: left;
        ${isClickable ? 'cursor: pointer;' : ''}
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
        border-radius: ${euiTheme.border.radius.medium};
      `} ${interactive ? raiseOnHoverClassName : ''}`}
    >
      {/* Heading: a rounded-square logo badge alongside the stacked name + subtitle. */}
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <div
            className={css`
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 6px;
              border-radius: ${euiTheme.border.radius.medium};
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
              border: 0.5px solid ${euiTheme.colors.borderBaseSubdued};
            `}
          >
            <EuiIcon type={data.icon ?? DEFAULT_SOURCE_ICON} size="m" />
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
              color: ${euiTheme.colors.textHeading};
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {data.title}
          </EuiText>
          <EuiText
            size="xs"
            color="subdued"
            className={css`
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {data.subtitle}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* Footer: throughput (monospace) and health, grouped together on the left. */}
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            className={css`
              font-family: ${euiTheme.font.familyCode};
              font-size: 10px;
            `}
          >
            {data.rate}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="success" textSize="xs">
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

// A freshly-placed source starts as this attention card — a danger-bordered
// single card (not a card-within-a-card, matching source/pipeline's plain
// card treatment) prompting the user to finish setting it up. Clicking is
// handled at the canvas level (onNodeClick), same as the configured card, so
// the whole node stays draggable.
export function UnconfiguredSourceContents({
  data,
  interactive = true,
}: {
  data: SourceNodeData;
  interactive?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const raiseOnHoverClassName = useRaiseOnHoverClassName();
  return (
    <EuiPanel
      hasShadow={false}
      paddingSize="none"
      className={`${css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
        width: 204px;
        padding: ${euiTheme.size.m};
        text-align: left;
        cursor: pointer;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.danger};
        border-radius: ${euiTheme.border.radius.medium};
      `} ${interactive ? raiseOnHoverClassName : ''}`}
    >
      {/* Heading: a rounded-square logo badge alongside the stacked name + subtitle. */}
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <div
            className={css`
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 6px;
              border-radius: ${euiTheme.border.radius.medium};
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
              border: 0.5px solid ${euiTheme.colors.borderBaseSubdued};
            `}
          >
            <EuiIcon type={UNCONFIGURED_SOURCE_ICON} size="m" />
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
              color: ${euiTheme.colors.textHeading};
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {data.title}
          </EuiText>
          <EuiText
            size="xs"
            color="subdued"
            className={css`
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {data.subtitle}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText
        size="xs"
        className={css`
          color: ${euiTheme.colors.danger};
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        {i18n.translate('xpack.streams.streamsCanvas.clickToConfigure', {
          defaultMessage: 'Click to configure',
        })}
      </EuiText>
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
      {data.mode === 'unconfigured' ? (
        <UnconfiguredSourceContents data={data} />
      ) : (
        <SourceNodeContents data={data} />
      )}
      <Handle type="source" position={Position.Right} className={anchorHandleClassName} />
    </div>
  );
});
SourceNode.displayName = 'SourceNode';
