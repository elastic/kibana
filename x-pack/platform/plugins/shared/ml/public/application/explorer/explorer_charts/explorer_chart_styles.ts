/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { useEuiFontSize, useEuiTheme, mathWithUnits, transparentize } from '@elastic/eui';

import {
  getThemeResolvedSeverityColor,
  getThemeResolvedSeverityStrokeColor,
  ML_ANOMALY_THRESHOLD,
} from '@kbn/ml-anomaly-utils';

export const useCssMlExplorerChartContainer = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const isDarkMode = colorMode === 'DARK';
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
      stroke: euiTheme.colors.lightestShade,
      shapeRendering: 'crispEdges',
    },

    '.axis .tick line.ml-tick-emphasis': {
      stroke: euiTheme.colors.lightShade,
    },

    '.axis text': {
      fill: euiTheme.colors.textParagraph,
    },

    '.axis .tick line': {
      stroke: euiTheme.colors.lightestShade,
      strokeWidth: '1px',
    },

    '.values-line': {
      fill: 'none',
      stroke: isDarkMode ? euiTheme.colors.vis.euiColorVisGrey0 : euiTheme.colors.darkestShade,
      strokeWidth: '1px',
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
    },

    '.anomaly-marker:hover': {
      strokeWidth: '6px',
      stroke: euiTheme.colors.primary,
    },

    '.anomaly-marker.critical': {
      fill: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.CRITICAL, euiTheme),
      stroke: getThemeResolvedSeverityStrokeColor(ML_ANOMALY_THRESHOLD.CRITICAL, euiTheme),
    },

    '.anomaly-marker.major': {
      fill: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.MAJOR, euiTheme),
      stroke: getThemeResolvedSeverityStrokeColor(ML_ANOMALY_THRESHOLD.MAJOR, euiTheme),
    },

    '.anomaly-marker.minor': {
      fill: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.MINOR, euiTheme),
      stroke: getThemeResolvedSeverityStrokeColor(ML_ANOMALY_THRESHOLD.MINOR, euiTheme),
    },

    '.anomaly-marker.warning': {
      fill: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.WARNING, euiTheme),
      stroke: getThemeResolvedSeverityStrokeColor(ML_ANOMALY_THRESHOLD.WARNING, euiTheme),
    },

    '.anomaly-marker.low': {
      fill: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.LOW, euiTheme),
      stroke: getThemeResolvedSeverityStrokeColor(ML_ANOMALY_THRESHOLD.LOW, euiTheme),
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
