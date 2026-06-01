/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  useEuiTheme,
  EuiText,
  EuiToolTip,
  EuiHealth,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { getComponentAccentColor, getHealthStatusColor } from '../utils';

import type { OTelGraphNodeData } from './constants';
import { COMPONENT_TYPE_LABELS } from './constants';

type ComponentNodeType = Node<OTelGraphNodeData, 'component'>;

export const ComponentNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<ComponentNodeType>) => {
    const { euiTheme } = useEuiTheme();

    const accentColor = getComponentAccentColor(data.componentType, euiTheme);

    const containerStyles = css`
      background: ${euiTheme.colors.backgroundBasePlain};
      border: 1px solid ${euiTheme.colors.borderBasePlain};
      border-left: 4px solid ${accentColor};
      border-radius: ${euiTheme.border.radius.medium};
      padding: ${euiTheme.size.xs} ${euiTheme.size.s};
      min-width: 140px;
      max-width: 220px;
      box-shadow: 0 1px 3px ${euiTheme.colors.lightShade};
      cursor: pointer;
      outline: ${selected ? `2px solid ${accentColor}` : 'none'};
      outline-offset: -1px;
    `;

    const handleStyles = css`
      visibility: hidden;
    `;

    const typeStyles = css`
      color: ${accentColor};
      font-size: ${euiTheme.size.m};
      font-weight: ${euiTheme.font.weight.semiBold};
      line-height: 1;
      margin-bottom: 2px;
    `;

    const labelStyles = css`
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    return (
      <div
        css={containerStyles}
        data-test-subj={`otelGraphNode-${data.componentType}-${data.label}`}
      >
        <Handle type="target" position={targetPosition ?? Position.Left} css={handleStyles} />
        <div css={typeStyles}>{COMPONENT_TYPE_LABELS[data.componentType]}</div>
        <EuiToolTip content={data.label}>
          <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
            {data.healthStatus && (
              <EuiFlexItem grow={false}>
                <EuiHealth color={getHealthStatusColor(data.healthStatus, euiTheme)} />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiText size="xs" css={labelStyles} tabIndex={0}>
                {data.label}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
        <Handle type="source" position={sourcePosition ?? Position.Right} css={handleStyles} />
      </div>
    );
  }
);

ComponentNode.displayName = 'ComponentNode';
