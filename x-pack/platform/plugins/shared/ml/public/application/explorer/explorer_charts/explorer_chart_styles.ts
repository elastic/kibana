/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { useEuiFontSize, useEuiTheme, mathWithUnits, transparentize } from '@elastic/eui';

import { ML_SEVERITY_COLORS } from '@kbn/ml-anomaly-utils';

export const useCssMlExplorerChartContainer = () => {
  const { euiTheme } = useEuiTheme();
  const euiFontSizeXS = useEuiFontSize('xs').fontSize;

  return css({
    overflow: 'hidden',

    '.ml-explorer-chart-svg': {
      fontSize: euiFontSizeXS,
      fontFamily: euiTheme.font.family,

      '.line-chart': {
        rect: {
          fill: euiTheme.colors.emptyShade,
          opacity: 1,
        },

        'rect.selected-interval': {
          fill: transparentize('#c8c8c8', 0.1),
          stroke: euiTheme.colors.darkShade,
          strokeWidth: mathWithUnits(euiTheme.size.xs, (x) => x / 2),
          strokeOpacity: 0.8,
        },

        'rect.scheduled-event-marker': {
          strokeWidth: '1px',
          stroke: euiTheme.colors.darkShade,
          fill: euiTheme.colors.lightShade,
          pointerEvents: 'none',
        },
      },
    },

    '.axis path, .axis line': {
      fill: 'none',
      stroke: euiTheme.border.color,
      shapeRendering: 'crispEdges',
    },

    '.axis .tick line.ml-tick-emphasis': {
      stroke: transparentize('#000', 0.2),
    },

    '.axis text': {
      fill: euiTheme.colors.lightShade,
    },

    '.axis .tick line': {
      stroke: euiTheme.colors.lightShade,
      strokeWidth: '1px',
    },

    '.values-line': {
      fill: 'none',
      stroke: euiTheme.colors.primary,
      strokeWidth: '2px',
    },

    '.values-dots circle, .values-dots-circle': {
      fill: euiTheme.colors.primary,
      strokeWidth: 0,
    },

    '.values-dots circle.values-dots-circle-blur': {
      fill: euiTheme.colors.mediumShade,
    },

    '.metric-value': {
      opacity: 1,
      fill: 'transparent',
      stroke: euiTheme.colors.primary,
      strokeWidth: 0,
    },

    '.anomaly-marker': {
      strokeWidth: '1px',
      stroke: euiTheme.colors.mediumShade,
    },

    '.anomaly-marker:hover': {
      strokeWidth: '6px',
      stroke: euiTheme.colors.primary,
    },

    '.anomaly-marker.critical': {
      fill: ML_SEVERITY_COLORS.CRITICAL,
    },

    '.anomaly-marker.major': {
      fill: ML_SEVERITY_COLORS.MAJOR,
    },

    '.anomaly-marker.minor': {
      fill: ML_SEVERITY_COLORS.MINOR,
    },

    '.anomaly-marker.warning': {
      fill: ML_SEVERITY_COLORS.WARNING,
    },

    '.anomaly-marker.low': {
      fill: ML_SEVERITY_COLORS.LOW,
    },

    '.metric-value:hover, .anomaly-marker:hover': {
      strokeWidth: '6px',
      strokeOpacity: 0.65,
    },

    'ml-explorer-chart-axis-emphasis': {
      fontWeight: 'bold',
    },
  });
};

export const cssMlExplorerChart = css({
  overflow: 'hidden',
});
