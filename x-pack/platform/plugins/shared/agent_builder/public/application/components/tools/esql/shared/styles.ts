/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const visualizationActionsClassName = 'agentBuilderVisualizationActions';
export const visualizationTimePickerContainerClassName =
  'agentBuilderVisualizationTimePickerContainer';

export const visualizationWrapperStyles =
  (dimensions?: { width?: number }) =>
  ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      overflow: 'visible',
      display: 'flex',
      flexDirection: 'column',
      ...(dimensions?.width !== undefined
        ? {
            maxWidth: dimensions.width,
            '.echMetric': {
              border: euiTheme.border.thin,
              borderRadius: euiTheme.border.radius.small,
            },
          }
        : {}),
      [`.${visualizationActionsClassName} + .${visualizationTimePickerContainerClassName}`]: {
        width: `calc(100% - ${euiTheme.base * 4}px)`,
      },
      '.echChart ul': {
        listStyleType: 'none',
        marginInlineStart: 0,
      },

      p: {
        margin: 0,
      },

      '.expExpressionRenderer__expression': {
        padding: `${euiTheme.size.s} 0`,
        '[class*="metric_vis_renderer"]': {
          paddingLeft: euiTheme.size.base,
        },
      },
    });

export const visualizationHeaderStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: euiTheme.size.s,
    width: '100%',
    boxSizing: 'border-box',
    marginBlockStart: euiTheme.size.base,
    marginBlockEnd: euiTheme.size.s,
    paddingInline: euiTheme.size.base,
  });

export const visualizationEmbeddableStyles = (height: number) =>
  css({
    flex: '1 1 auto',
    minHeight: 0,
    height,
  });

export const actionsContainerStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    position: 'absolute',
    top: euiTheme.size.base,
    right: euiTheme.size.base,
    zIndex: euiTheme.levels.flyout,
  });
