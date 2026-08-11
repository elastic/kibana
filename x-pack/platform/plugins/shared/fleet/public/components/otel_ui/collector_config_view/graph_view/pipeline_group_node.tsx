/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { useEuiTheme, EuiText, EuiHealth, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

import { getHealthStatusColor } from '../utils';

import type { OTelPipelineGroupNodeData } from './config_to_graph';

type PipelineGroupNodeType = Node<OTelPipelineGroupNodeData, 'pipelineGroup'>;

export const PipelineGroupNode = memo(({ data }: NodeProps<PipelineGroupNodeType>) => {
  const { euiTheme } = useEuiTheme();

  const healthDotColor = useMemo(() => {
    const { healthCounts } = data;
    if (!healthCounts) return getHealthStatusColor(data.healthStatus ?? 'unknown', euiTheme);
    const { healthy, total } = healthCounts;
    if (healthy === total) return euiTheme.colors.backgroundFilledSuccess;
    if (healthy === 0) return euiTheme.colors.backgroundFilledDanger;
    return euiTheme.colors.backgroundFilledWarning;
  }, [data, euiTheme]);

  const containerStyles = css`
    width: 100%;
    height: 100%;
    border: ${data.isSelected
      ? `2px solid ${euiTheme.colors.primary}`
      : `1px dashed ${euiTheme.colors.borderBasePlain}`};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${data.isSelected
      ? euiTheme.colors.backgroundBasePrimary
      : euiTheme.colors.backgroundBaseSubdued};
    cursor: pointer;
  `;

  const labelStyles = css`
    position: absolute;
    top: ${euiTheme.size.xs};
    left: ${euiTheme.size.s};
  `;

  return (
    <div css={containerStyles} data-test-subj={`otelPipelineGroup-${data.label}`}>
      <div css={labelStyles}>
        <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
          {data.healthStatus && (
            <EuiFlexItem grow={false}>
              <EuiHealth color={healthDotColor} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <strong>{data.label}</strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
});

PipelineGroupNode.displayName = 'PipelineGroupNode';
