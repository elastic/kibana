/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GraphMetadata, PositionXY } from '..';
import { EdgeLabelWidth } from '../edge/styles';
import { getShapeHandlePosition } from '../edge/utils';
import { LabelNodeData, NodeData } from '../node';
import { LABEL_BORDER_WIDTH, LABEL_PADDING_X, NODE_HEIGHT, NODE_WIDTH } from '../node/styles';

type LabelAlignment = 'right' | 'center' | 'left';
const PADDING = 20;
const EdgeLabelHeight = 33;
const LABEL_FONT = `600 7.875px Inter, "system-ui", Helvetica, Arial, sans-serif`;
const LABEL_PADDING = (LABEL_PADDING_X + LABEL_BORDER_WIDTH) * 2;

export const layoutGraph = (nodes: NodeData[], metadata: GraphMetadata) => {
  // Scan graph for groups and labels nodes
  // Calculate the alignment of the grouped labels
  // Position the labels - stacked on top of each other and centered
  // Calculated the group size
  // Position the group node based on the alignment and group size

  // Scan graph for groups
  nodes
    .filter((node) => node.shape === 'group')
    .forEach((groupNode) => {
      const children = nodes.filter(
        (node) => node.shape === 'label' && node.parentId === groupNode.id
      );
      const stackSize = children.length;

      const { source, target } = children[0] as LabelNodeData;
      const sourceNode = nodes.find((node) => node.id === source);
      const targetNode = nodes.find((node) => node.id === target);

      if (sourceNode && targetNode) {
        const sourcePos = sourceNode.position;
        const targetPos = targetNode.position;
        const { alignment: labelAlignment } = calcAlignment({
          edgeId: buildEdgeId(source, target),
          source,
          sourcePos,
          target,
          targetPos,
          graphMetadata: metadata,
        });

        const sourceX = sourcePos.x - getShapeHandlePosition(sourceNode.shape);
        const sourceY = sourcePos.y;
        const targetX = targetPos.x + getShapeHandlePosition(targetNode.shape) - 1;
        const targetY = targetPos.y;
        const STACK_VERTICAL_PADDING = 20;
        const MIN_STACK_HEIGHT = 70;
        const stackHeight = Math.max(
          stackSize * EdgeLabelHeight + (stackSize - 1) * STACK_VERTICAL_PADDING,
          MIN_STACK_HEIGHT
        );
        const space = (stackHeight - stackSize * EdgeLabelHeight) / (stackSize - 1);
        const groupNodeWidth = children.reduce((acc, child) => {
          const currLblWidth =
            PADDING * 2 +
            Math.max(EdgeLabelWidth, LABEL_PADDING + getTextWidth(child.label ?? '', LABEL_FONT));
          return Math.max(acc, currLblWidth);
        }, EdgeLabelWidth + PADDING * 2);

        groupNode.size = {
          width: groupNodeWidth,
          height: stackHeight,
        };

        children.forEach((child, idx) => {
          child.position = {
            x:
              (groupNodeWidth -
                Math.max(
                  EdgeLabelWidth,
                  LABEL_PADDING + getTextWidth(child.label ?? '', LABEL_FONT)
                )) /
              2,
            y: idx * (EdgeLabelHeight * 2 + space),
          };
        });

        const stackX = sourceX + NODE_WIDTH + (targetX - sourceX - NODE_WIDTH - groupNodeWidth) / 2;
        const stackY =
          (labelAlignment === 'center' || labelAlignment === 'left' ? sourceY : targetY) +
          (NODE_HEIGHT - stackHeight) / 2;

        groupNode.position = {
          x: stackX,
          y: stackY,
        };
      }
    });
};

function calcAlignment({
  edgeId,
  source,
  sourcePos,
  target,
  targetPos,
  graphMetadata,
}: {
  edgeId: string;
  source: string;
  sourcePos: PositionXY;
  target: string;
  targetPos: PositionXY;
  graphMetadata: GraphMetadata | undefined;
}): {
  alignment: LabelAlignment;
} {
  let alignment: LabelAlignment;

  if (!source || !target || !graphMetadata) {
    return { alignment: 'left' };
  }

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

  return { alignment };
}

function buildEdgeId(source: string, target: string) {
  return `a(${source})-b(${target})`;
}

function getTextWidth(text: string, font: string) {
  // re-use canvas object for better performance
  const canvas: HTMLCanvasElement =
    // @ts-ignore
    getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  if (context) {
    context.font = font;
  }
  const metrics = context?.measureText(text);
  return metrics?.width ?? 0;
}

function getCssStyle(element: HTMLElement, prop: string) {
  return window.getComputedStyle(element, null).getPropertyValue(prop);
}

// @ts-ignore
function getCanvasFont(el = document.body) {
  const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
  const fontSize = getCssStyle(el, 'font-size') || '16px';
  const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';

  return `${fontWeight} ${fontSize} ${fontFamily}`;
}
