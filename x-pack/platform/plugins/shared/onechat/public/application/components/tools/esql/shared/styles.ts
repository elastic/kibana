/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const visualizationWrapper = (euiTheme: UseEuiTheme['euiTheme'], height: number) =>
  css({
    position: 'relative',
    height,
    overflow: 'visible',
    '&:hover > .visualization-button-actions, &:focus-within > .visualization-button-actions': {
      opacity: 1,
      pointerEvents: 'auto',
    },
  });

export const actionsContainer = (euiTheme: UseEuiTheme['euiTheme']) =>
  css({
    position: 'absolute',
    top: `-${euiTheme.size.xs}`,
    right: `-${euiTheme.size.xs}`,
    zIndex: 2,
    opacity: 0,
    pointerEvents: 'none',
    transition: `opacity ${euiTheme.animation.fast} ease-in-out`,
    display: 'inline-flex',
    gap: 0,
  });

export const mapVisualizationStyles = css`
  position: relative;
  overflow: hidden;
  min-height: 400px;
  padding-top: 28px;

  .mapEmbeddableContainer {
    min-height: 400px;
  }
`;
