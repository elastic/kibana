/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shared node styling: the connection-anchor handle dots and the node entry
// animation.

import { css, keyframes } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';

export const hiddenHandleClassName = css`
  visibility: hidden;
`;

// Connection anchors (the small circles at the ends of connectors, matching the
// product reference). The anchor markup lives on ReactFlow handles so it doubles
// as the connect/reconnect hit target.
//
// The handle ELEMENT is kept tiny at rest so it doesn't intercept clicks on the
// node, while the visible dot is drawn with an ::after pseudo-element centered on
// the handle's anchor point. This lets the canvas expand the handle to cover the
// whole node *while a connection is being dragged* (see connectingHighlight
// className) — making the entire node a forgiving drop target — without the dot
// moving or the handle blocking clicks the rest of the time.
//
// States:
//   - rest: a subtle grey dot, so the connection point is discoverable.
//   - magnetized (`connectingto.valid`): a filled primary dot with a ring — the
//     cursor has snapped to this anchor and releasing will connect here.
const ANCHOR_DOT_SIZE = 9;
export function useAnchorHandleClassName() {
  const { euiTheme } = useEuiTheme();
  return css`
    width: ${ANCHOR_DOT_SIZE}px;
    height: ${ANCHOR_DOT_SIZE}px;
    min-width: ${ANCHOR_DOT_SIZE}px;
    min-height: ${ANCHOR_DOT_SIZE}px;
    background: transparent;
    border: none;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: ${ANCHOR_DOT_SIZE}px;
      height: ${ANCHOR_DOT_SIZE}px;
      transform: translate(-50%, -50%);
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.mediumShade};
      border-radius: 50%;
      transition: background-color 80ms ease-out, border-color 80ms ease-out,
        box-shadow 80ms ease-out;
    }

    &.connectingto.valid::after {
      background-color: ${euiTheme.colors.primary};
      border-color: ${euiTheme.colors.primary};
      box-shadow: 0 0 0 3px ${euiTheme.colors.backgroundBasePrimary},
        0 0 0 5px ${euiTheme.colors.primary};
    }
  `;
}

const inflate = keyframes`
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const inflateClassName = css`
  animation: ${inflate} 180ms ease-out;
  transform-origin: center center;
`;

// A subtle "raise" affordance for clickable cards: on hover the card lifts a
// couple of pixels and its shadow deepens, so it reads as pressable. Applied to
// every clickable node card (source / pipeline / routing / destination).
//
// The lift is a transform (not a margin/position change) so it never reflows the
// layout or the connector anchors, and it composites cheaply. We deliberately
// don't touch box-shadow on the selected/search states — those are driven by
// higher-specificity rules in streams_canvas.tsx and should win — so the raise
// is expressed as a transform plus a shadow only in the resting/hover states.
export function useRaiseOnHoverClassName() {
  const { euiTheme } = useEuiTheme();
  return css`
    transition: transform 120ms ease-out, box-shadow 120ms ease-out;
    will-change: transform;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(43, 57, 79, 0.16), 0 8px 16px rgba(43, 57, 79, 0.08);
    }
  `;
}
