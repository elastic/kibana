/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { useEuiTheme, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';

import type { OTelPipelineGroupNodeData } from './config_to_graph';

type PipelineGroupNodeType = Node<OTelPipelineGroupNodeData, 'pipelineGroup'>;

export const PipelineGroupNode = memo(({ data }: NodeProps<PipelineGroupNodeType>) => {
  const { euiTheme } = useEuiTheme();

  const containerStyles = css`
    width: 100%;
    height: 100%;
    border: 1px dashed ${euiTheme.colors.borderBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBaseSubdued};
  `;

  const labelStyles = css`
    position: absolute;
    top: ${euiTheme.size.xs};
    left: ${euiTheme.size.s};
  `;

  return (
    <div css={containerStyles} data-test-subj={`otelPipelineGroup-${data.label}`}>
      <div css={labelStyles}>
        <EuiText size="xs" color="subdued">
          <strong>{data.label}</strong>
        </EuiText>
      </div>
    </div>
  );
});

PipelineGroupNode.displayName = 'PipelineGroupNode';
