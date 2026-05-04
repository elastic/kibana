/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FlowEdge } from '@kbn/streams-plugin/common';

export type ThroughputEdgeData = Pick<FlowEdge, 'health' | 'throughput' | 'isMock' | 'kind'> &
  Record<string, unknown>;

export type ThroughputEdgeType = Edge<ThroughputEdgeData>;

export const formatRate = (docsPerSec: number): string => {
  if (docsPerSec === 0) return '0/s';
  if (docsPerSec < 1000) return `${Math.round(docsPerSec)}/s`;
  if (docsPerSec < 1_000_000) return `${(docsPerSec / 1000).toFixed(1)}k/s`;
  return `${(docsPerSec / 1_000_000).toFixed(1)}M/s`;
};

const getEdgeColor = (
  status: FlowEdge['health'] extends { status: infer S } ? S : string | undefined,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
): string => {
  switch (status) {
    case 'healthy':
      return euiTheme.colors.success;
    case 'degraded':
      return euiTheme.colors.warning;
    case 'down':
      return euiTheme.colors.danger;
    default:
      return euiTheme.colors.subduedText;
  }
};

export const ThroughputEdge: React.FC<EdgeProps<ThroughputEdgeType>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) => {
  const { euiTheme } = useEuiTheme();

  const docsPerSec = data?.throughput?.docsPerSec ?? 0;
  const healthStatus = data?.health?.status;

  const strokeWidth = Math.max(1, Math.log10(docsPerSec + 10) * 2);
  const strokeColor = getEdgeColor(healthStatus, euiTheme);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const showLabel = docsPerSec > 0;
  const labelText = (data?.isMock ? '~' : '') + formatRate(docsPerSec);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          animation: showLabel ? 'dashdraw 0.5s linear infinite' : undefined,
        }}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            css={css`
              position: absolute;
              transform: translate(-50%, -50%) translate(${labelX}px, ${labelY}px);
              background: ${euiTheme.colors.backgroundBasePlain};
              border: 1px solid ${euiTheme.colors.lightShade};
              border-radius: ${euiTheme.border.radius.small};
              padding: 1px 4px;
              font-size: ${euiTheme.font.scale.xs}em;
              color: ${euiTheme.colors.subduedText};
              pointer-events: none;
              white-space: nowrap;
              z-index: ${euiTheme.levels.content};
            `}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
