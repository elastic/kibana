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
export const KI_GRAPH_NODE_STROKE_WIDTH_HOVER = 1.5;

const MEMORY_RECT_INSET = 0.88;
const MEMORY_CORNER_RADIUS_RATIO = 0.22;

const polygonAtRadius = (cx: number, cy: number, radius: number): string => {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return points.join(' ');
};

const diamondAtRadius = (cx: number, cy: number, radius: number): string =>
  `${cx},${cy - radius} ${cx + radius},${cy} ${cx},${cy + radius} ${cx - radius},${cy}`;

const rectMetrics = (cx: number, cy: number, radius: number) => {
  const half = radius * MEMORY_RECT_INSET;
  const size = half * 2;
  return {
    x: cx - half,
    y: cy - half,
    width: size,
    height: size,
    rx: size * MEMORY_CORNER_RADIUS_RATIO,
  };
};

interface RingShapeProps {
  cx: number;
  cy: number;
  radius: number;
  stroke: string;
  strokeWidth: number;
}

interface BodyShapeProps extends RingShapeProps {
  fill: string;
}

const HexagonRing = ({ cx, cy, radius, stroke, strokeWidth }: RingShapeProps) => (
  <polygon
    points={polygonAtRadius(cx, cy, radius)}
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
  />
);

const CircleRing = ({ cx, cy, radius, stroke, strokeWidth }: RingShapeProps) => (
  <circle cx={cx} cy={cy} r={radius} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
);

const MemoryRing = ({ cx, cy, radius, stroke, strokeWidth }: RingShapeProps) => {
  const { x, y, width, height, rx } = rectMetrics(cx, cy, radius);
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      ry={rx}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
};

const WorkflowRing = ({ cx, cy, radius, stroke, strokeWidth }: RingShapeProps) => (
  <polygon
    points={diamondAtRadius(cx, cy, radius)}
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
  />
);

const HexagonBody = ({ cx, cy, radius, fill, stroke, strokeWidth }: BodyShapeProps) => (
  <polygon
    points={polygonAtRadius(cx, cy, radius)}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
  />
);

const CircleBody = ({ cx, cy, radius, fill, stroke, strokeWidth }: BodyShapeProps) => (
  <circle cx={cx} cy={cy} r={radius} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
);

const MemoryBody = ({ cx, cy, radius, fill, stroke, strokeWidth }: BodyShapeProps) => {
  const { x, y, width, height, rx } = rectMetrics(cx, cy, radius);
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      ry={rx}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
};

const WorkflowBody = ({ cx, cy, radius, fill, stroke, strokeWidth }: BodyShapeProps) => (
  <polygon
    points={diamondAtRadius(cx, cy, radius)}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
  />
);

const renderOuterRing = (
  kind: KiGraphNodeKind,
  cx: number,
  cy: number,
  ringRadius: number,
  stroke: string,
  strokeWidth: number
) => {
  const props = { cx, cy, radius: ringRadius, stroke, strokeWidth };
  switch (kind) {
    case 'entity':
      return <HexagonRing {...props} />;
    case 'fact':
    case 'document':
    case 'crawler':
      return <CircleRing {...props} />;
    case 'memory':
      return <MemoryRing {...props} />;
    case 'workflow':
      return <WorkflowRing {...props} />;
    default: {
      const exhaustiveKind: never = kind;
      return exhaustiveKind;
    }
  }
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
  const props = { cx, cy, radius, fill, stroke, strokeWidth };
  switch (kind) {
    case 'entity':
      return <HexagonBody {...props} />;
    case 'fact':
    case 'document':
    case 'crawler':
      return <CircleBody {...props} />;
    case 'memory':
      return <MemoryBody {...props} />;
    case 'workflow':
      return <WorkflowBody {...props} />;
    default: {
      const exhaustiveKind: never = kind;
      return exhaustiveKind;
    }
  }
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
