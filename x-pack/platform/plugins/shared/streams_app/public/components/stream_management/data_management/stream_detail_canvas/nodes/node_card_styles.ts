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

/**
 * Shared interactive styling for canvas node cards, matching the Figma node
 * states: grab cursor, subtle raise-on-hover, a primary ring when selected,
 * This might change once we have more EUI components for the canvas.
 */
export const getNodeCardStyles = (
  euiTheme: UseEuiTheme['euiTheme'],
  { width, selected, dragging }: NodeCardStyleOptions
) => css`
  width: ${width}px;
  cursor: ${dragging ? 'grabbing' : 'grab'};
  border-color: ${selected
    ? euiTheme.colors.borderStrongPrimary
    : euiTheme.colors.borderBaseSubdued};
  transition: transform ${euiTheme.animation.fast} ease, box-shadow ${euiTheme.animation.fast} ease,
    border-color ${euiTheme.animation.fast} ease;
  ${selected ? `box-shadow: 0 0 0 1px ${euiTheme.colors.borderStrongPrimary};` : ''}
  ${dragging
    ? `transform: translateY(-2px);
       box-shadow: 0 ${euiTheme.size.xs} ${euiTheme.size.s} rgba(43, 57, 79, 0.15);`
    : ''}

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 ${euiTheme.size.xs} ${euiTheme.size.xs} rgba(43, 57, 79, 0.12);
    ${!selected ? `border-color: ${euiTheme.colors.borderBasePlain};` : ''}
  }
`;
