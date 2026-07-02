/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The inline pipeline node: a small horizontal card with the pipeline icon,
// name, and throughput/latency stats. Clickable (cursor:pointer) — opens the
// pipeline flyout via the canvas onNodeClick.

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import type { PipelineFlowNode, PipelineNodeData } from '../types';
import { inflateClassName, useAnchorHandleClassName, useRaiseOnHoverClassName } from '../node-styles';

const statTextClassName = (color: string) => css`
  font-size: 10px;
  line-height: 12px;
  color: ${color};
`;

function PipelineNodeContents({ data }: { data: PipelineNodeData }) {
  const { euiTheme } = useEuiTheme();
  const raiseOnHoverClassName = useRaiseOnHoverClassName();

  // The inline pipeline node from the design: a compact pill holding the
  // processor icon and its throughput/latency stats, with the pipeline name
  // shown as a small badge floating just above the pill.
  return (
    <div
      className={`${css`
        position: relative;
        display: inline-flex;
        cursor: pointer;
        border-radius: ${euiTheme.border.radius.small};
      `} ${raiseOnHoverClassName}`}
    >
      <EuiPanel
        hasShadow
        paddingSize="none"
        className={css`
          display: flex;
          gap: ${euiTheme.size.s};
          align-items: center;
          justify-content: center;
          padding: ${euiTheme.size.xs} ${euiTheme.size.s};
          border-radius: ${euiTheme.border.radius.small};
        `}
      >
        <EuiIcon type="processor" size="m" color={euiTheme.colors.textParagraph} />
        <div
          className={css`
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            white-space: nowrap;
          `}
        >
          {data.eps ? (
            <EuiText className={statTextClassName(euiTheme.colors.textSubdued)}>{data.eps}</EuiText>
          ) : null}
          {data.latency ? (
            <EuiText className={statTextClassName(euiTheme.colors.textSubdued)}>
              {data.latency}
            </EuiText>
          ) : null}
        </div>
      </EuiPanel>
      {/* Pipeline name badge, centered just above the pill. */}
      <div
        className={css`
          position: absolute;
          top: -17px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px ${euiTheme.size.xs};
          border-radius: ${euiTheme.border.radius.small};
          background-color: ${euiTheme.colors.backgroundBaseSubdued};
          white-space: nowrap;
        `}
      >
        <EuiText
          className={css`
            font-size: 9px;
            line-height: 12px;
            font-weight: ${euiTheme.font.weight.semiBold};
            color: ${euiTheme.colors.textParagraph};
          `}
        >
          {data.title}
        </EuiText>
      </div>
    </div>
  );
}

export const PipelineNode = memo(({ data }: NodeProps<PipelineFlowNode>) => {
  const anchorHandleClassName = useAnchorHandleClassName();
  return (
    <div className={inflateClassName}>
      <Handle type="target" position={Position.Left} className={anchorHandleClassName} />
      <PipelineNodeContents data={data} />
      <Handle type="source" position={Position.Right} className={anchorHandleClassName} />
    </div>
  );
});
PipelineNode.displayName = 'PipelineNode';
