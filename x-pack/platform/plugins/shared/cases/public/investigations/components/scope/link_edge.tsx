/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { BaseEdge, EdgeLabelRenderer, getStraightPath, useInternalNode } from '@xyflow/react';
import type { Edge, EdgeProps, InternalNode } from '@xyflow/react';
import type { LinkItem } from '../../../../common/investigations/types';
import { LINK_KIND_ICONS } from '../../icons';
import { NODE_HEIGHT, NODE_WIDTH } from './scope_helpers';
import * as i18n from './translations';

export interface LinkEdgeData extends Record<string, unknown> {
  link: LinkItem;
  color: string;
  /** Perpendicular offset, in pixels, that keeps parallel links apart. */
  offset: number;
  fromName: string;
  toName: string;
  onSelect: (linkId: string) => void;
}
export type LinkFlowEdge = Edge<LinkEdgeData, 'link'>;

const MARGIN = 6;

interface Rect {
  cx: number;
  cy: number;
  halfWidth: number;
  halfHeight: number;
}

const getRect = (node: InternalNode): Rect => {
  const width = node.measured.width ?? NODE_WIDTH;
  const height = node.measured.height ?? NODE_HEIGHT;
  const { x, y } = node.internals.positionAbsolute;
  return { cx: x + width / 2, cy: y + height / 2, halfWidth: width / 2, halfHeight: height / 2 };
};

/** The point where the line from `rect` towards (tx, ty) leaves the rectangle. */
const clipToRect = (rect: Rect, tx: number, ty: number): { x: number; y: number } => {
  const dx = tx - rect.cx;
  const dy = ty - rect.cy;
  if (dx === 0 && dy === 0) {
    return { x: rect.cx, y: rect.cy };
  }
  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : (rect.halfWidth + MARGIN) / Math.abs(dx);
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : (rect.halfHeight + MARGIN) / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);
  return { x: rect.cx + dx * scale, y: rect.cy + dy * scale };
};

export const LinkEdge: React.FC<EdgeProps<LinkFlowEdge>> = ({
  id,
  source,
  target,
  data,
  markerEnd,
  selected,
}) => {
  const { euiTheme } = useEuiTheme();
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode || !data) {
    return null;
  }

  const from = getRect(sourceNode);
  const to = getRect(targetNode);
  const length = Math.hypot(to.cx - from.cx, to.cy - from.cy) || 1;
  const shiftX = (-(to.cy - from.cy) / length) * data.offset;
  const shiftY = ((to.cx - from.cx) / length) * data.offset;
  const start = clipToRect(
    { ...from, cx: from.cx + shiftX, cy: from.cy + shiftY },
    to.cx + shiftX,
    to.cy + shiftY
  );
  const end = clipToRect(
    { ...to, cx: to.cx + shiftX, cy: to.cy + shiftY },
    from.cx + shiftX,
    from.cy + shiftY
  );
  const [path, labelX, labelY] = getStraightPath({
    sourceX: start.x,
    sourceY: start.y,
    targetX: end.x,
    targetY: end.y,
  });
  const { link, color, fromName, toName, onSelect } = data;
  const suspected = link.status === 'suspected';
  const dismissed = link.status === 'dismissed';

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={22}
        style={{
          stroke: color,
          strokeWidth: selected ? 3 : 1.75,
          strokeDasharray: suspected || dismissed ? '7 5' : undefined,
          opacity: dismissed ? 0.5 : 1,
        }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          className="nodrag nopan"
          aria-label={i18n.EDGE_ARIA(link.link.label, fromName, toName)}
          aria-pressed={Boolean(selected)}
          onClick={() => onSelect(link.id)}
          data-test-subj={`investigationScopeEdge-${link.id}`}
          data-status={link.status}
          css={css`
            position: absolute;
            display: inline-flex;
            align-items: center;
            gap: ${euiTheme.size.xs};
            max-width: 190px;
            padding: 1px ${euiTheme.size.xs};
            border: ${selected ? `1px solid ${color}` : '1px solid transparent'};
            border-radius: ${euiTheme.border.radius.small};
            background-color: ${euiTheme.colors.backgroundBasePlain};
            color: ${euiTheme.colors.textParagraph};
            font-size: ${euiTheme.size.m};
            line-height: 1.3;
            cursor: pointer;
            pointer-events: all;
            opacity: ${dismissed ? 0.6 : 1};
          `}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          <EuiIcon
            type={LINK_KIND_ICONS[link.link.kind]}
            size="s"
            color={color}
            aria-hidden="true"
          />
          <span
            css={css`
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {link.link.label}
          </span>
        </button>
      </EdgeLabelRenderer>
    </>
  );
};
LinkEdge.displayName = 'LinkEdge';
