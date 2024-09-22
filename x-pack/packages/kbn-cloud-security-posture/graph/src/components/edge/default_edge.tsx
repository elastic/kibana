/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BaseEdge, getBezierPath } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import type { EdgeProps } from '.';
import { getMarker } from './styles';
import { getShapeHandlePosition } from './utils';

export function DefaultEdge({
  id,
  label,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
}: EdgeProps) {
  const { euiTheme } = useEuiTheme();
  const color = data?.color ?? 'primary';

  const [edgePath] = getBezierPath({
    sourceX:
      sourceX -
      getShapeHandlePosition(data?.sourceShape) * (data?.sourceShape === 'group' ? -1 : 1),
    sourceY,
    sourcePosition,
    targetX: targetX + getShapeHandlePosition(data?.targetShape),
    targetY,
    targetPosition,
    curvature:
      0.1 *
      (data?.sourceShape === 'group' ||
      (data?.sourceShape === 'label' && data?.targetShape === 'group')
        ? -1
        : 1),
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: euiTheme.colors[color],
          strokeDasharray: '2,2',
        }}
        markerEnd={
          data?.targetShape !== 'label' && data?.targetShape !== 'group'
            ? getMarker(color)
            : undefined
        }
      />
    </>
  );
}
