/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The single connector edge type. It draws a rounded orthogonal path, exposes
// an "Add step" (+) popover at its midpoint, and draws the call-to-action dot
// for a dangling routing branch.

import React, { useContext, useEffect, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, type EdgeTypes } from '@xyflow/react';
import {
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import {
  EdgeHopsContext,
  EdgeRoutingFlyoutContext,
  EdgeSegmentsContext,
  PipelineFlyoutContext,
} from '../contexts';
import { buildOrthogonalPath } from './orthogonal-path';
import { segmentsForEdge } from './edge-bridges';

// A subtle "data flowing" animation: a dashed overlay stroke laid over the edge
// whose dash pattern marches from the source toward the destination. The path is
// drawn source-first (see buildOrthogonalPath), so animating stroke-dashoffset
// down to 0 sends the dashes downstream. One full DASH_PERIOD of travel per
// cycle keeps the motion seamless (the pattern lands exactly one repeat along).
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
const flowClassName = css`
  fill: none;
  stroke-dasharray: ${DASH} ${GAP};
  animation: ${flowMarch} 0.9s linear infinite;
  pointer-events: none;
`;

function EdgeMenuItem({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      className={css`
        width: 100%;
        text-align: left;
        background: transparent;
        border: none;
        padding: ${euiTheme.size.xs} 0;
        cursor: pointer;
        &:hover p:first-of-type {
          text-decoration: underline;
        }
      `}
    >
      <EuiText
        size="xs"
        className={css`
          font-weight: ${euiTheme.font.weight.medium};
          color: ${euiTheme.colors.textPrimary};
        `}
      >
        {title}
      </EuiText>
      <EuiText size="xs" color="subdued">
        {description}
      </EuiText>
    </button>
  );
}

function PipelineRoutingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const { euiTheme } = useEuiTheme();
  const edgeHops = useContext(EdgeHopsContext);
  const segReg = useContext(EdgeSegmentsContext);
  const openPipelineFlyout = useContext(PipelineFlyoutContext);
  const openEdgeRoutingFlyout = useContext(EdgeRoutingFlyoutContext);
  const [isHovered, setIsHovered] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // A dangling routing connector (one whose head is not yet wired to a
  // destination) always shows a prominent grab dot at its loose end as a
  // call-to-action to connect it.
  const isDanglingRouting = Boolean(data?.routingEndpointNodeId);

  // Square-elbow (orthogonal) connector with lightly rounded corners; the
  // vertical segment sits at the horizontal midpoint.
  const midX = (sourceX + targetX) / 2;
  const labelX = midX;
  const labelY = (sourceY + targetY) / 2;
  // Publish this edge's exact segments so bridges are computed from the same
  // coordinates we render with. Dangling routing connectors don't participate.
  useEffect(() => {
    if (isDanglingRouting) {
      segReg.remove(id);
      return;
    }
    segReg.publish(id, segmentsForEdge(sourceX, sourceY, targetX, targetY, midX));
    return () => segReg.remove(id);
  }, [id, sourceX, sourceY, targetX, targetY, midX, isDanglingRouting, segReg]);

  // Dangling routing connectors don't bridge (they're a temporary affordance).
  const hops = isDanglingRouting ? [] : edgeHops.get(id) ?? [];
  const edgePath = buildOrthogonalPath(sourceX, sourceY, targetX, targetY, midX, 20, hops);

  const isActive = isHovered || isPopoverOpen;
  const strokeColor = isActive ? euiTheme.colors.primary : euiTheme.colors.mediumShade;

  // The connectors' grab anchors are the node handles themselves (small circles
  // at each connection point), so we don't draw anchors on a normal edge. The one
  // exception is a dangling routing connector: its loose end rests on an endpoint
  // node with no visible handle, so we draw a filled primary dot there as a
  // call-to-action to connect it to a destination.
  return (
    <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={isDanglingRouting ? undefined : markerEnd}
        style={{ ...style, stroke: strokeColor, strokeWidth: 1.5 }}
        interactionWidth={24}
      />
      {/* Decorative "data flowing" overlay: marching dashes from source →
          destination. Skipped for a dangling routing connector, which is a
          temporary affordance with no live data flowing through it yet. */}
      {!isDanglingRouting ? (
        <path
          d={edgePath}
          className={flowClassName}
          stroke={isActive ? euiTheme.colors.primary : euiTheme.colors.borderBaseProminent}
          strokeWidth={2.5}
          strokeLinecap="round"
          style={{ opacity: isActive ? 0.85 : 0.7 }}
        />
      ) : null}
      {isDanglingRouting ? (
        <circle
          cx={targetX}
          cy={targetY}
          r={5}
          stroke={euiTheme.colors.primary}
          strokeWidth={1.5}
          fill={euiTheme.colors.primary}
          style={{ pointerEvents: 'none' }}
        />
      ) : null}
      <EdgeLabelRenderer>
        {isActive ? (
          <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`nodrag nopan ${css`
              position: absolute;
              transform: translate(-50%, -50%) translate(${labelX}px, ${labelY}px);
              pointer-events: all;
              z-index: 5;
            `}`}
          >
            <EuiPopover
              isOpen={isPopoverOpen}
              closePopover={() => setIsPopoverOpen(false)}
              anchorPosition="upCenter"
              panelPaddingSize="none"
              button={
                <button
                  type="button"
                  aria-label={i18n.translate('xpack.streams.streamsCanvas.addStep', {
                    defaultMessage: 'Add step',
                  })}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsPopoverOpen((open) => !open);
                  }}
                  className={css`
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                    padding: 0;
                    cursor: pointer;
                    border-radius: 50%;
                    color: ${euiTheme.colors.primary};
                    background-color: ${euiTheme.colors.backgroundBasePrimary};
                    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.primary};
                    box-shadow: 0 1px 2px rgba(43, 57, 79, 0.16), 0 2px 4px rgba(43, 57, 79, 0.05);
                  `}
                >
                  <EuiIcon type="plus" size="s" color="primary" />
                </button>
              }
            >
              <EuiPanel
                hasShadow={false}
                paddingSize="none"
                className={css`
                  padding: ${euiTheme.size.s} ${euiTheme.size.m};
                  min-width: 220px;
                `}
              >
                <EdgeMenuItem
                  title={i18n.translate('xpack.streams.streamsCanvas.pipeline', {
                    defaultMessage: 'Pipeline',
                  })}
                  description={i18n.translate('xpack.streams.streamsCanvas.pipelineDescription', {
                    defaultMessage: 'transform your data in transit',
                  })}
                  onClick={() => {
                    setIsPopoverOpen(false);
                    openPipelineFlyout(id);
                  }}
                />
                <EuiHorizontalRule margin="xs" />
                <EdgeMenuItem
                  title={i18n.translate('xpack.streams.streamsCanvas.routing', {
                    defaultMessage: 'Routing',
                  })}
                  description={i18n.translate('xpack.streams.streamsCanvas.routingDescription', {
                    defaultMessage: 'conditionally route or duplicate your data',
                  })}
                  onClick={() => {
                    setIsPopoverOpen(false);
                    openEdgeRoutingFlyout(id);
                  }}
                />
              </EuiPanel>
            </EuiPopover>
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </g>
  );
}

export const edgeTypes: EdgeTypes = {
  pipelineRouting: PipelineRoutingEdge,
};
