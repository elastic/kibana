/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BaseEdge, EdgeLabelRenderer } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import type { EdgeProps } from '.';
import { EdgeLabel, EdgeLabelContainer, EdgeLabelOnHover, getMarker } from './styles';
import { generateCustomEdgePath } from './generate_custom_edge_path';

export function CustomPathEdge({ id, label, sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const { euiTheme } = useEuiTheme();
  const color = data?.color ?? 'primary';

  const [edgePath, labelX, labelY] = data
    ? generateCustomEdgePath({ x: sourceX, y: sourceY }, { x: targetX, y: targetY }, data)
    : ['', 0, 0];

  // const scale = labelX - sourceX - PADDING * 2 < EdgeLabelWidth ? ((labelX - sourceX - PADDING * 2) / EdgeLabelWidth) : 1;
  /* scale={+scale.toFixed(2)}*/
  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: euiTheme.colors[color],
          strokeDasharray: '2,2',
        }}
        markerEnd={getMarker(color)}
      />
      <EdgeLabelRenderer>
        <EdgeLabelContainer className="nodrag nopan">
          {!data?.interactive || <EdgeLabelOnHover labelX={labelX} labelY={labelY} color={color} />}
          <EdgeLabel textAlign="center" color={color} labelX={labelX} labelY={labelY}>
            {label ?? id}
          </EdgeLabel>
        </EdgeLabelContainer>
      </EdgeLabelRenderer>
    </>
  );
}
