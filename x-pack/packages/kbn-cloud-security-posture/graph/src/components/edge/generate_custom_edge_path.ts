/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EdgeData } from '.';
import type { PositionXY, GraphMetadata } from '..';
import type { NodeShape } from '../node';
import { EdgeLabelHeight, EdgeLabelWidth } from './styles';

type LabelAlignment = 'right' | 'center' | 'left';
const PADDING = 10;
const HORIZONTAL_PADDING = 20;

export function generateCustomEdgePath(
  sourcePos: PositionXY,
  targetPos: PositionXY,
  data: EdgeData
): readonly [string, number, number] {
  const { id, source, sourceShape, target, targetShape, graphMetadata } = data!;

  const {
    alignment: labelAlignment,
    isStackedEdge,
    stackSize,
    edgeIdx,
  } = calcAlignment({
    id,
    source,
    sourcePos,
    target,
    targetPos,
    graphMetadata,
  });

  const sourceX = sourcePos.x - getShapeHandlePosition(sourceShape);
  const sourceY = sourcePos.y;
  const targetX = targetPos.x + getShapeHandlePosition(targetShape) - 1;
  const targetY = targetPos.y;

  if (!isStackedEdge) {
    let curveEndX;
    let curveStartX;
    let labelX: number = 0;
    let labelY: number = 0;

    if (labelAlignment === 'left') {
      curveEndX = targetX - HORIZONTAL_PADDING;
      curveStartX = sourceX + Math.abs(curveEndX - sourceX) * 0.65;
      labelX = curveStartX - PADDING - EdgeLabelWidth / 2;
      labelY = sourceY;
    } else if (labelAlignment === 'right') {
      curveEndX = targetX - Math.abs(targetX - sourceX) * 0.65;
      curveStartX = sourceX + HORIZONTAL_PADDING;
      labelX = curveEndX + PADDING + EdgeLabelWidth / 2;
      labelY = targetY;
    } else if (labelAlignment === 'center') {
      labelX = sourceX + (targetX - sourceX - EdgeLabelWidth) / 2 + PADDING + EdgeLabelWidth / 2;
      labelY = sourceY;
    }

    if (curveStartX && curveEndX) {
      const { controlX1, controlY1, controlX2, controlY2 } = calculateCurveControlPoints({
        curveStartX,
        curveEndX,
        curveStartY: sourceY,
        curveEndY: targetY,
      });

      return [
        `M ${sourceX},${sourceY}
    H ${curveStartX}
    C ${controlX1},${controlY1},
      ${controlX2},${controlY2},
      ${curveEndX},${targetY}
    H ${targetX}
  `,
        labelX,
        labelY,
      ];
    }
  } else {
    if (labelAlignment === 'center') {
      const [edgePath, labelX, labelY] = generateStackedEdgePath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        stackSize,
        edgeIdx,
      });

      return [edgePath, labelX, labelY];
    } else if (labelAlignment === 'right') {
      const curveToStackEndX = targetX - Math.abs(targetX - sourceX) * 0.75;
      const curveToStackEndY = targetY;
      const curveToStackStartX = sourceX + HORIZONTAL_PADDING;
      const curveToStackStartY = sourceY;

      const {
        controlX1: curveToStackCtrl1X,
        controlY1: curveToStackCtrl1Y,
        controlX2: curveToStackCtrl2X,
        controlY2: curveToStackCtrl2Y,
      } = calculateCurveControlPoints({
        curveStartX: curveToStackStartX,
        curveEndX: curveToStackEndX,
        curveStartY: curveToStackStartY,
        curveEndY: curveToStackEndY,
      });

      const pathToStack = `M ${sourceX},${sourceY}
        H ${curveToStackStartX}
        C ${curveToStackCtrl1X},${curveToStackCtrl1Y},
          ${curveToStackCtrl2X},${curveToStackCtrl2Y},
          ${curveToStackEndX},${targetY}
        `;

      const [path, labelX, labelY] = generateStackedEdgePath({
        sourceX: curveToStackEndX,
        sourceY: curveToStackEndY,
        targetX,
        targetY,
        stackSize,
        edgeIdx,
      });

      return [pathToStack + path, labelX, labelY];
    } else if (labelAlignment === 'left') {
      const curveToTargetStartX = targetX - HORIZONTAL_PADDING - Math.abs(targetX - sourceX) * 0.15;
      const curveToTargetStartY = sourceY;
      const curveToTargetEndX = targetX - HORIZONTAL_PADDING;
      const curveToTargetEndY = targetY;

      const [path, labelX, labelY] = generateStackedEdgePath({
        sourceX,
        sourceY,
        targetX: curveToTargetStartX,
        targetY: curveToTargetStartY,
        stackSize,
        edgeIdx,
      });

      const {
        controlX1: curveToTargetCtrl1X,
        controlY1: curveToTargetCtrl1Y,
        controlX2: curveToTargetCtrl2X,
        controlY2: curveToTargetCtrl2Y,
      } = calculateCurveControlPoints({
        curveStartX: curveToTargetStartX,
        curveStartY: sourceY,
        curveEndX: targetX,
        curveEndY: targetY,
      });

      return [
        `M ${sourceX},${sourceY}
        ${path}
        H ${curveToTargetStartX}
        C ${curveToTargetCtrl1X},${curveToTargetCtrl1Y},
          ${curveToTargetCtrl2X},${curveToTargetCtrl2Y},
          ${curveToTargetEndX},${curveToTargetEndY}
        H ${targetX}
        `,
        labelX,
        labelY,
      ];
    }
  }

  return [
    `M ${sourceX},${sourceY}
  H ${targetX}
  `,
    0,
    0,
  ];
}

interface CustomEdgePathParameters {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  labelAlignment: LabelAlignment;
  isStackedEdge: boolean;
  stackSize: number;
  edgeIdx: number;
}

function generateStackedEdgePath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  stackSize,
  edgeIdx,
}: Pick<
  CustomEdgePathParameters,
  'sourceX' | 'sourceY' | 'targetX' | 'targetY' | 'stackSize' | 'edgeIdx'
>): readonly [string, number, number] {
  const STACK_VERTICAL_PADDING = 20;
  const MIN_STACK_HEIGHT = 100;
  const stackHeight = Math.max(
    stackSize * EdgeLabelHeight + (stackSize - 1) * STACK_VERTICAL_PADDING,
    MIN_STACK_HEIGHT
  );
  const space = (stackHeight - stackSize * EdgeLabelHeight) / (stackSize - 1);
  const stackStartY = sourceY - stackHeight / 2;
  const labelY = stackStartY + (EdgeLabelHeight + space) * edgeIdx + EdgeLabelHeight / 2;
  const curve1StartX = sourceX + HORIZONTAL_PADDING;
  const curve1EndX = curve1StartX + Math.abs(targetX - sourceX) * 0.15;
  const curve2EndX = targetX - HORIZONTAL_PADDING;
  const curve2StartX = curve2EndX - Math.abs(targetX - sourceX) * 0.15;
  const labelX = curve1EndX + (curve2StartX - curve1EndX) / 2;

  const {
    controlX1: curve1Ctrl1X,
    controlY1: curve1Ctrl1Y,
    controlX2: curve1Ctrl2X,
    controlY2: curve1Ctrl2Y,
  } = calculateCurveControlPoints({
    curveStartX: curve1StartX,
    curveEndX: curve1EndX,
    curveStartY: sourceY,
    curveEndY: labelY,
  });
  const {
    controlX1: curve2Ctrl1X,
    controlY1: curve2Ctrl1Y,
    controlX2: curve2Ctrl2X,
    controlY2: curve2Ctrl2Y,
  } = calculateCurveControlPoints({
    curveStartX: curve2StartX,
    curveEndX: curve2EndX,
    curveStartY: labelY,
    curveEndY: targetY,
  });

  return [
    `M ${sourceX},${sourceY}
    H ${curve1StartX}
    C ${curve1Ctrl1X},${curve1Ctrl1Y},
      ${curve1Ctrl2X},${curve1Ctrl2Y},
      ${curve1EndX},${labelY}
    H ${curve2StartX}
    C ${curve2Ctrl1X},${curve2Ctrl1Y},
      ${curve2Ctrl2X},${curve2Ctrl2Y},
      ${curve2EndX},${targetY}
    H ${targetX}`,
    labelX,
    labelY,
  ];
}

function calculateCurveControlPoints({
  curveStartX,
  curveEndX,
  curveStartY,
  curveEndY,
}: {
  curveStartX: number;
  curveStartY: number;
  curveEndX: number;
  curveEndY: number;
}) {
  const curveFactor = 0.8; // Adjust this to change the curve

  // Midpoint between source and target (vertically offset)
  const midX = (curveStartX + curveEndX) / 2;

  // Adjust control points for smoother flow
  const controlX1 = midX + (curveEndX - midX) * curveFactor;
  const controlY1 = curveStartY;
  const controlX2 = midX - (curveEndX - midX) * curveFactor;
  const controlY2 = curveEndY;
  return { controlX1, controlY1, controlX2, controlY2 };
}

function calcAlignment({
  id,
  source,
  sourcePos,
  target,
  targetPos,
  graphMetadata,
}: {
  id: string;
  source: string;
  sourcePos: PositionXY;
  target: string;
  targetPos: PositionXY;
  graphMetadata: GraphMetadata | undefined;
}): {
  alignment: LabelAlignment;
  isStackedEdge: boolean;
  stackSize: number;
  edgeIdx: number;
} {
  let alignment: LabelAlignment;

  if (!source || !target || !graphMetadata) {
    return { alignment: 'left', isStackedEdge: false, stackSize: 1, edgeIdx: 0 };
  }

  const edgeId = buildEdgeId(source, target);
  const isStackedEdge = graphMetadata.edges[edgeId].edgesStacked > 1;
  const stackSize = graphMetadata.edges[edgeId].edgesStacked;
  const edgeIdx = graphMetadata.edges[edgeId].edges.indexOf(id);

  if (sourcePos.y === targetPos.y) {
    alignment = 'center';
  } else if (
    graphMetadata.nodes[source].edgesOut === graphMetadata.edges[edgeId].edges.length &&
    graphMetadata.nodes[target].edgesIn > graphMetadata.edges[edgeId].edges.length
  ) {
    alignment = 'left';
  } else {
    alignment = 'right';
  }

  return { alignment, isStackedEdge, stackSize, edgeIdx };
}

function getShapeHandlePosition(shape?: NodeShape) {
  switch (shape) {
    case 'hexagon':
      return 14;
    case 'pentagon':
      return 14;
    case 'ellipse':
      return 13;
    case 'rectangle':
      return 16;
    case 'diamond':
      return 10;
    default:
      return 0;
  }
}

function buildEdgeId(source: string, target: string) {
  return `edge-${source}-${target}`;
}
