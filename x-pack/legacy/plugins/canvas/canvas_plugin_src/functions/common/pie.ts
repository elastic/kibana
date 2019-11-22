/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, map, groupBy } from 'lodash';
// @ts-ignore lodash.keyby imports invalid member from @types/lodash
import keyBy from 'lodash.keyby';
// @ts-ignore untyped local
import { getColorsFromPalette } from '../../../common/lib/get_colors_from_palette';
// @ts-ignore untyped local
import { getLegendConfig } from '../../../common/lib/get_legend_config';
import { getFunctionHelp } from '../../../i18n';
import {
  Legend,
  Palette,
  PointSeries,
  Render,
  SeriesStyle,
  Style,
  ExpressionFunction,
} from '../../../types';

interface PieSeriesOptions {
  show: boolean;
  innerRadius: number;
  stroke: {
    width: number;
  };
  label: {
    show: boolean;
    radius: number;
  };
  tilt: number;
  radius: number | 'auto';
}

interface PieOptions {
  canvas: boolean;
  colors: string[];
  legend: {
    show: boolean;
    backgroundOpacity: number;
    labelBoxBorderColor: string;
    position: Legend;
  };
  grid: {
    show: boolean;
  };
  series: {
    pie: PieSeriesOptions;
  };
}

interface PieData {
  label: string;
  data: number[];
  color?: string;
}

interface Pie {
  font: Style;
  data: PieData[];
  options: PieOptions;
}

interface Arguments {
  palette: Palette;
  seriesStyle: SeriesStyle[];
  radius: number | 'auto';
  hole: number;
  labels: boolean;
  labelRadius: number;
  font: Style;
  legend: Legend | false;
  tilt: number;
}

export function pie(): ExpressionFunction<'pie', PointSeries, Arguments, Render<Pie>> {
  const { help, args: argHelp } = getFunctionHelp().pie;

  return {
    name: 'pie',
    aliases: [],
    type: 'render',
    help,
    context: {
      types: ['pointseries'],
    },
    args: {
      font: {
        types: ['style'],
        help: argHelp.font,
        default: '{font}',
      },
      hole: {
        types: ['number'],
        default: 0,
        help: argHelp.hole,
      },
      labelRadius: {
        types: ['number'],
        default: 100,
        help: argHelp.labelRadius,
      },
      labels: {
        types: ['boolean'],
        default: true,
        help: argHelp.labels,
      },
      legend: {
        types: ['string', 'boolean'],
        help: argHelp.legend,
        default: false,
        options: [...Object.values(Legend), false],
      },
      palette: {
        types: ['palette'],
        help: argHelp.palette,
        default: '{palette}',
      },
      radius: {
        types: ['string', 'number'],
        help: argHelp.radius,
        default: 'auto',
      },
      seriesStyle: {
        multi: true,
        types: ['seriesStyle'],
        help: argHelp.seriesStyle,
      },
      tilt: {
        types: ['number'],
        default: 1,
        help: argHelp.tilt,
      },
    },
    fn: (context, args) => {
      const { tilt, radius, labelRadius, labels, hole, legend, palette, font, seriesStyle } = args;
      const seriesStyles = keyBy(seriesStyle || [], 'label') || {};

      const data: PieData[] = map(groupBy(context.rows, 'color'), (series, label = '') => {
        const item: PieData = {
          label,
          data: series.map(point => point.size || 1),
        };

        const style = seriesStyles[label];

        // append series style, if there is a match
        if (style) {
          item.color = get(style, 'color');
        }

        return item;
      });

      return {
        type: 'render',
        as: 'pie',
        value: {
          font,
          data,
          options: {
            canvas: false,
            colors: getColorsFromPalette(palette, data.length),
            legend: getLegendConfig(legend, data.length),
            grid: {
              show: false,
            },
            series: {
              pie: {
                show: true,
                innerRadius: Math.max(hole, 0) / 100,
                stroke: {
                  width: 0,
                },
                label: {
                  show: labels,
                  radius: (labelRadius >= 0 ? labelRadius : 100) / 100,
                },
                tilt,
                radius,
              },
              bubbles: {
                show: false,
              },
              shadowSize: 0,
            },
          },
        },
      };
    },
  };
}
