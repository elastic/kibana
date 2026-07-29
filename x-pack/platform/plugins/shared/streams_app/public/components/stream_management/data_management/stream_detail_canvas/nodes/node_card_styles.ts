/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

interface NodeCardStyleOptions {
  width: number;
  selected?: boolean;
  dragging?: boolean;
}

// The selected card's shadow: an on-brand primary ring plus a soft primary glow.
const selectedShadow = (euiTheme: UseEuiTheme['euiTheme']) =>
  `0 0 0 2px ${euiTheme.colors.primary}, 0 2px 8px 0 color-mix(in srgb, ${euiTheme.colors.primary} 25%, transparent)`;

const raisedShadow = (euiTheme: UseEuiTheme['euiTheme']) =>
  `0 4px 8px 0 color-mix(in srgb, ${euiTheme.colors.shadow} 16%, transparent), 0 8px 16px 0 color-mix(in srgb, ${euiTheme.colors.shadow} 8%, transparent)`;

export const getNodeCardStyles = (
  euiTheme: UseEuiTheme['euiTheme'],
  { width, selected, dragging }: NodeCardStyleOptions
) => css`
  width: ${width}px;
  cursor: ${dragging ? 'grabbing' : 'grab'};
  border-color: ${selected ? euiTheme.colors.primary : euiTheme.colors.borderBaseSubdued};
  transition: transform 120ms ease-out, box-shadow 120ms ease-out, border-color 120ms ease-out;
  // Resting depth: every card carries a subtle shadow so it lifts off the canvas
  // surface, matching the prototype. euiTheme.colors.shadow is EUI's ink base,
  // so this adapts to light/dark themes.
  box-shadow: 0 1px 2px 0 color-mix(in srgb, ${euiTheme.colors.shadow} 12%, transparent);
  // An unmistakable, on-brand primary ring marks the selected node(s).
  ${selected ? `box-shadow: ${selectedShadow(euiTheme)};` : ''}
  ${dragging ? `transform: translateY(-2px); box-shadow: ${raisedShadow(euiTheme)};` : ''}

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${selected ? selectedShadow(euiTheme) : raisedShadow(euiTheme)};
    ${!selected ? `border-color: ${euiTheme.colors.borderBasePlain};` : ''}
  }
`;
