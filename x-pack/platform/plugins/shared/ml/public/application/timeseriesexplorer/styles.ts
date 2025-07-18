/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { css } from '@emotion/react';

import { useEuiFontSize, useEuiTheme, transparentize } from '@elastic/eui';
import {
  ML_ANOMALY_THRESHOLD,
  getThemeResolvedSeverityColor,
  getThemeResolvedSeverityStrokeColor,
} from '@kbn/ml-anomaly-utils';

// Annotations constants
const mlAnnotationBorderWidth = '2px';
const mlAnnotationRectDefaultStrokeOpacity = 0.2;
const mlAnnotationRectDefaultFillOpacity = 0.1;

export const useTimeseriesExplorerStyles = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const { fontSize: euiFontSizeXS } = useEuiFontSize('xs', { unit: 'px' });
  const { fontSize: euiFontSizeS } = useEuiFontSize('s', { unit: 'px' });

  const isDarkMode = colorMode === 'DARK';

  return useMemo(
    () =>
      css({
        color: euiTheme.colors.darkShade,

        '.ml-timeseries-chart': {
          svg: {
            fontSize: euiFontSizeXS,
            fontFamily: euiTheme.font.family,
          },

          '.axis': {
            'path, line': {
              fill: 'none',
              stroke: euiTheme.colors.lightestShade,
              shapeRendering: 'crispEdges',
              pointerEvents: 'none',
            },

            text: {
              fill: euiTheme.colors.textParagraph,
            },

            '.tick line': {
              stroke: euiTheme.colors.lightestShade,
            },
          },

          '.chart-border': {
            stroke: euiTheme.colors.lightestShade,
            fill: 'none',
            strokeWidth: 1,
            shapeRendering: 'crispEdges',
          },

          '.chart-border-highlight': {
            stroke: euiTheme.colors.lightShade,
            strokeWidth: 1,

            '&:hover': {
              opacity: 1,
            },
          },

          '.area': {
            strokeWidth: 1,

            '&.bounds': {
              fill: transparentize(euiTheme.colors.lightShade, 0.6),
              pointerEvents: 'none',
            },

            '&.forecast': {
              fill: transparentize(euiTheme.colors.vis.euiColorVis1, 0.4),
              pointerEvents: 'none',
            },
          },

          '.values-line': {
            fill: 'none',
            stroke: isDarkMode
              ? euiTheme.colors.vis.euiColorVisGrey0
              : euiTheme.colors.darkestShade,
            strokeWidth: 1,
            pointerEvents: 'none',

            '&.forecast': {
              stroke: euiTheme.colors.vis.euiColorVis0,
              pointerEvents: 'none',
            },
          },

          '.hidden': {
            visibility: 'hidden',
          },

          '.values-dots circle': {
            fill: 'none',
            strokeWidth: 0,
          },

          '.metric-value': {
            opacity: 1,
            fill: 'transparent',
            stroke: euiTheme.colors.primary,
            strokeWidth: 0,
          },

          '.anomaly-marker': {
            strokeWidth: 1,

            '&.critical': {
              fill: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.CRITICAL, euiTheme),
              stroke: getThemeResolvedSeverityStrokeColor(ML_ANOMALY_THRESHOLD.CRITICAL, euiTheme),
            },

            '&.major': {
              fill: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.MAJOR, euiTheme),
              stroke: getThemeResolvedSeverityStrokeColor(ML_ANOMALY_THRESHOLD.MAJOR, euiTheme),
            },

            '&.minor': {
              fill: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.MINOR, euiTheme),
              stroke: getThemeResolvedSeverityStrokeColor(ML_ANOMALY_THRESHOLD.MINOR, euiTheme),
            },

            '&.warning': {
              fill: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.WARNING, euiTheme),
              stroke: getThemeResolvedSeverityStrokeColor(ML_ANOMALY_THRESHOLD.WARNING, euiTheme),
            },

            '&.low': {
              fill: getThemeResolvedSeverityColor(ML_ANOMALY_THRESHOLD.LOW, euiTheme),
              stroke: getThemeResolvedSeverityStrokeColor(ML_ANOMALY_THRESHOLD.LOW, euiTheme),
            },
          },

          '.metric-value:hover, .anomaly-marker:hover, .anomaly-marker.highlighted': {
            strokeWidth: 6,
            strokeOpacity: 0.65,
            stroke: transparentize(
              isDarkMode ? euiTheme.colors.vis.euiColorVisGrey0 : euiTheme.colors.darkestShade,
              0.5
            ),
          },

          'rect.scheduled-event-marker': {
            strokeWidth: 1,
            stroke: euiTheme.colors.darkShade,
            fill: euiTheme.colors.lightShade,
          },

          '.forecast': {
            '.metric-value, .metric-value:hover': {
              stroke: euiTheme.colors.vis.euiColorVis1,
            },
          },

          '.focus-chart': {
            '.x-axis-background': {
              line: {
                fill: 'none',
                shapeRendering: 'crispEdges',
                stroke: euiTheme.colors.lightestShade,
              },
              rect: {
                fill: euiTheme.colors.lightestShade,
              },
            },
            '.focus-zoom': {
              fill: euiTheme.colors.darkShade,
              a: {
                text: {
                  fill: euiTheme.colors.primary,
                  cursor: 'pointer',
                },
                '&:hover, &:active, &:focus': {
                  textDecoration: 'underline',
                  fill: euiTheme.colors.primary,
                },
              },
            },
          },

          '.context-chart': {
            '.x.axis path': {
              display: 'none',
            },
            '.axis text': {
              fontSize: '10px',
              fill: euiTheme.colors.textParagraph,
            },
            '.values-line': {
              strokeWidth: 1,
            },
            '.mask': {
              polygon: {
                fillOpacity: 0.1,
              },
              '.area.bounds': {
                fill: euiTheme.colors.lightShade,
              },
              '.values-line': {
                strokeWidth: 1,
                stroke: euiTheme.colors.mediumShade,
              },
            },
          },

          '.swimlane .axis text': {
            display: 'none',
          },

          '.swimlane rect.swimlane-cell-hidden': {
            display: 'none',
          },

          '.brush .extent': {
            fillOpacity: 0,
            shapeRendering: 'crispEdges',
            stroke: euiTheme.colors.lightShade,
            strokeWidth: 2,
            cursor: 'move',
            '&:hover': {
              opacity: 1,
            },
          },

          '.top-border': {
            fill: euiTheme.colors.emptyShade,
          },

          'foreignObject.brush-handle': {
            pointerEvents: 'none',
            paddingTop: '1px',
          },

          'div.brush-handle-inner': {
            border: `1px solid ${euiTheme.colors.darkShade}`,
            backgroundColor: euiTheme.colors.lightestShade,
            height: '70px',
            width: '10px',
            textAlign: 'center',
            cursor: 'ew-resize',
            marginTop: '9px',
            fontSize: euiFontSizeS,
            fill: euiTheme.colors.darkShade,
          },

          'div.brush-handle-inner-left': {
            borderRadius: `${euiTheme.border.radius.small} 0 0 ${euiTheme.border.radius.small}`,
          },

          'div.brush-handle-inner-right': {
            borderRadius: `0 ${euiTheme.border.radius.small} ${euiTheme.border.radius.small} 0`,
          },

          'rect.brush-handle': {
            strokeWidth: 1,
            stroke: euiTheme.colors.darkShade,
            fill: euiTheme.colors.lightShade,
            pointerEvents: 'none',
            '&:hover': {
              opacity: 1,
            },
          },
        },
      }),
    [euiTheme, euiFontSizeXS, isDarkMode, euiFontSizeS]
  );
};

export const useAnnotationStyles = () => {
  const { euiTheme } = useEuiTheme();
  const euiFontSizeXS = useEuiFontSize('xs', { unit: 'px' }).fontSize as string;

  return useMemo(
    () =>
      css({
        '.ml-annotation': {
          '&__brush': {
            '.extent': {
              stroke: euiTheme.colors.accent,
              strokeWidth: mlAnnotationBorderWidth,
              strokeDasharray: '2 2',
              fill: euiTheme.colors.accent,
              fillOpacity: 0.1,
              shapeRendering: 'geometricPrecision',
            },
          },

          '&__rect': {
            stroke: euiTheme.colors.accent,
            strokeWidth: mlAnnotationBorderWidth,
            strokeOpacity: mlAnnotationRectDefaultStrokeOpacity,
            fill: euiTheme.colors.accent,
            fillOpacity: mlAnnotationRectDefaultFillOpacity,
            shapeRendering: 'geometricPrecision',
            transition: `stroke-opacity ${euiTheme.animation.fast}, fill-opacity ${euiTheme.animation.fast}`,

            '&--highlight': {
              strokeOpacity: mlAnnotationRectDefaultStrokeOpacity * 2,
              fillOpacity: mlAnnotationRectDefaultFillOpacity * 2,
            },

            '&--blur': {
              strokeOpacity: mlAnnotationRectDefaultStrokeOpacity / 2,
              fillOpacity: mlAnnotationRectDefaultFillOpacity / 2,
            },
          },

          '&__text': {
            textAnchor: 'middle',
            fontSize: euiFontSizeXS,
            fontFamily: euiTheme.font.family,
            fontWeight: euiTheme.font.weight.medium,
            fill: euiTheme.colors.textInverse,
            transition: `fill ${euiTheme.animation.fast}`,
            userSelect: 'none',
          },

          '&__text-rect': {
            fill: euiTheme.colors.accent,
            transition: `fill ${euiTheme.animation.fast}`,

            '&--blur': {
              fill: euiTheme.colors.backgroundBaseAccent,
            },
          },

          '&--hidden': {
            display: 'none',
          },

          '&__context-rect': {
            stroke: euiTheme.colors.accent,
            strokeWidth: mlAnnotationBorderWidth,
            strokeOpacity: mlAnnotationRectDefaultStrokeOpacity,
            fill: euiTheme.colors.accent,
            fillOpacity: mlAnnotationRectDefaultFillOpacity,
            transition: `stroke-opacity ${euiTheme.animation.fast}, fill-opacity ${euiTheme.animation.fast}`,
            shapeRendering: 'geometricPrecision',

            '&--blur': {
              strokeOpacity: mlAnnotationRectDefaultStrokeOpacity / 2,
              fillOpacity: mlAnnotationRectDefaultFillOpacity / 2,
            },
          },
        },
      }),
    [euiTheme, euiFontSizeXS]
  );
};
