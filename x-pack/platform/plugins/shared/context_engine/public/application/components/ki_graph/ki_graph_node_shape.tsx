/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { KiGraphNodeKind } from './types';

const SELECTION_RING_GAP = 3;

export const KI_GRAPH_NODE_STROKE_WIDTH = 1;
export const KI_GRAPH_NODE_STROKE_WIDTH_SELECTED = 2;
const KI_GRAPH_NODE_STROKE_WIDTH_HOVER = 1.5;

const polygonAtRadius = (cx: number, cy: number, radius: number): string => {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return points.join(' ');
};

const renderOuterRing = (
  kind: KiGraphNodeKind,
  cx: number,
  cy: number,
  ringRadius: number,
  stroke: string,
  strokeWidth: number
) => {
  if (kind === 'entity') {
    return (
      <polygon
        points={polygonAtRadius(cx, cy, ringRadius)}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  return (
    <circle cx={cx} cy={cy} r={ringRadius} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
  );
};

const renderBody = (
  kind: KiGraphNodeKind,
  cx: number,
  cy: number,
  radius: number,
  fill: string,
  stroke: string,
  strokeWidth: number
) => {
  if (kind === 'entity') {
    return (
      <polygon
        points={polygonAtRadius(cx, cy, radius)}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  return (
    <circle cx={cx} cy={cy} r={radius} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
  );
};

export interface KiGraphNodeShapeProps {
  backdropFill: string;
  size: number;
  kind: KiGraphNodeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  isSelected: boolean;
  isHovered: boolean;
  hoverRingStroke?: string;
}

export const KiGraphNodeShape = memo(
  ({
    size,
    kind,
    fill,
    backdropFill,
    stroke,
    strokeWidth,
    isSelected,
    isHovered,
    hoverRingStroke,
  }: KiGraphNodeShapeProps) => {
    const cx = size / 2;
    const cy = size / 2;
    const bodyRadius = size / 2 - strokeWidth / 2;
    const ringRadius = size / 2 + SELECTION_RING_GAP;

    const showHoverRing = isHovered && !isSelected && hoverRingStroke !== undefined;
    const showSelectionRing = isSelected;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {showHoverRing
          ? renderOuterRing(
              kind,
              cx,
              cy,
              ringRadius,
              hoverRingStroke,
              KI_GRAPH_NODE_STROKE_WIDTH_HOVER
            )
          : null}
        {showSelectionRing ? renderOuterRing(kind, cx, cy, ringRadius, stroke, strokeWidth) : null}
        {/* Translucent fills would let edges show through, so an opaque layer goes underneath. */}
        {renderBody(kind, cx, cy, bodyRadius, backdropFill, 'none', 0)}
        {renderBody(kind, cx, cy, bodyRadius, fill, stroke, strokeWidth)}
      </svg>
    );
  }
);

KiGraphNodeShape.displayName = 'KiGraphNodeShape';
