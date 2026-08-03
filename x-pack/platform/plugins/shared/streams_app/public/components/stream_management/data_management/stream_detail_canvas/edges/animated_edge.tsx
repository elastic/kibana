/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css, keyframes } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

const DASH = 4;
const GAP = 8;
const DASH_PERIOD = DASH + GAP;

const flowMarch = keyframes`
  from {
    stroke-dashoffset: ${DASH_PERIOD};
  }
  to {
    stroke-dashoffset: 0;
  }
`;

const flowStyles = css`
  fill: none;
  stroke-dasharray: ${DASH} ${GAP};
  animation: ${flowMarch} 0.9s linear infinite;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const { euiTheme } = useEuiTheme();
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const isActive = isHovered || Boolean(selected);
  const strokeColor = isActive ? 'transparent' : euiTheme.colors.borderBaseProminent;

  return (
    <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, stroke: strokeColor, strokeWidth: 1 }}
        interactionWidth={24}
      />
      {isActive ? (
        <path
          d={edgePath}
          css={flowStyles}
          stroke={euiTheme.colors.primary}
          strokeWidth={1}
          strokeLinecap="round"
          style={{ opacity: 0.85 }}
        />
      ) : null}
    </g>
  );
}
