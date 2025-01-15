/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, keyBy, map, groupBy } from 'lodash';
import type { PaletteRegistry, PaletteOutput } from '@kbn/coloring';
import { getLegendConfig } from '../../common/lib/get_legend_config';
import { getFunctionHelp } from '../../i18n';
import {
  Legend,
  PointSeries,
  Render,
  SeriesStyle,
  Style,
  ExpressionFunctionDefinition,
} from '../../types';

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
    backgroundOpacity?: number;
    labelBoxBorderColor?: string;
    position?: Legend;
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

export interface Pie {
  font: Style;
  data: PieData[];
  options: PieOptions;
}

export interface Arguments {
  palette: PaletteOutput;
  seriesStyle: SeriesStyle[];
  radius: number | 'auto';
  hole: number;
  labels: boolean;
  labelRadius: number;
  font: Style;
  legend: Legend | false;
  tilt: number;
}

export function pieFunctionFactory(
  paletteService: PaletteRegistry
): () => ExpressionFunctionDefinition<'pie', PointSeries, Arguments, Render<Pie>> {
  return () => {
    const { help, args: argHelp } = getFunctionHelp().pie;

    return {
      name: 'pie',
      aliases: [],
      type: 'render',
      inputTypes: ['pointseries'],
      help,
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
      fn: (input, args) => {
        const { tilt, radius, labelRadius, labels, hole, legend, palette, font, seriesStyle } =
          args;
        const seriesStyles = keyBy(seriesStyle || [], 'label') || {};

        const data: PieData[] = map(groupBy(input.rows, 'color'), (series, label = '') => {
          const item: PieData = {
            label,
            data: series.map((point) => point.size || 1),
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
              colors: paletteService
                .get(palette.name || 'custom')
                .getCategoricalColors(data.length, palette.params),
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
  };
}
