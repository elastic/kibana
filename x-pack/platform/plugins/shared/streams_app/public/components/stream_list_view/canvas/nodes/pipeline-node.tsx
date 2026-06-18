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
import { PipelineNodeIcon } from '../../pipeline_node_icon';
import type { PipelineFlowNode, PipelineNodeData } from '../types';
import { inflateClassName, useAnchorHandleClassName, useRaiseOnHoverClassName } from '../node-styles';

function PipelineNodeContents({ data }: { data: PipelineNodeData }) {
  const { euiTheme } = useEuiTheme();
  const raiseOnHoverClassName = useRaiseOnHoverClassName();

  const stats = [data.eps, data.latency].filter(Boolean).join('・');

  // The "Big" pipeline node from the design: a horizontal card that always shows
  // the pipeline icon alongside its name and throughput/latency stats.
  return (
    <EuiPanel
      hasShadow
      paddingSize="none"
      className={`${css`
        display: flex;
        gap: ${euiTheme.size.s};
        align-items: center;
        justify-content: center;
        width: 120px;
        min-width: 120px;
        padding: 6px ${euiTheme.size.s};
        cursor: pointer;
        border-radius: ${euiTheme.border.radius.small};
      `} ${raiseOnHoverClassName}`}
    >
      <EuiIcon type={PipelineNodeIcon} size="s" color={euiTheme.colors.textParagraph} />
      <div
        className={css`
          display: flex;
          flex: 1 0 0;
          min-width: 0;
          flex-direction: column;
          align-items: flex-start;
          white-space: nowrap;
        `}
      >
        <EuiText
          size="xs"
          className={css`
            color: ${euiTheme.colors.textParagraph};
            font-weight: ${euiTheme.font.weight.semiBold};
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
          `}
        >
          {data.title}
        </EuiText>
        {stats ? (
          <EuiText
            className={css`
              font-size: 9px;
              line-height: 12px;
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            {stats}
          </EuiText>
        ) : null}
      </div>
    </EuiPanel>
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
