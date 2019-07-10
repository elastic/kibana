/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { plot } from '../../functions/common/plot';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../../types';
import { Position } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof plot>> = {
  help: i18n.translate('xpack.canvas.functions.plotHelpText', {
    defaultMessage: 'Configure a {plot} element',
    values: {
      plot: 'plot',
    },
  }),
  args: {
    defaultStyle: i18n.translate('xpack.canvas.functions.plot.args.defaultStyleHelpText', {
      defaultMessage: 'The default style to use for every series.',
    }),
    font: i18n.translate('xpack.canvas.functions.plot.args.fontHelpText', {
      defaultMessage:
        'The {css} font properties for the labels. For example, {fontFamily} or {fontWeight}.',
      values: {
        css: 'CSS',
        fontFamily: 'font-family',
        fontWeight: 'font-weight',
      },
    }),
    legend: i18n.translate('xpack.canvas.functions.plot.args.legendHelpText', {
      defaultMessage:
        'The legend position. For example, {positions}, or {false}. When `false`, the legend is hidden.',
      values: {
        positions: Object.values(Position)
          .map(position => `\`"${position}"\``)
          .join(', '),
        false: 'false',
      },
    }),
    palette: i18n.translate('xpack.canvas.functions.plot.args.paletteHelpText', {
      defaultMessage: 'A {palette} object for describing the colors to use in this chart',
      values: {
        palette: 'palette',
      },
    }),
    seriesStyle: i18n.translate('xpack.canvas.functions.plot.args.seriesStyleHelpText', {
      defaultMessage: 'A style of a specific series',
    }),
    xaxis: i18n.translate('xpack.canvas.functions.plot.args.xaxisHelpText', {
      defaultMessage: 'The axis configuration. When `{false}`, the axis is hidden.',
      values: {
        false: 'false',
      },
    }),
    yaxis: i18n.translate('xpack.canvas.functions.plot.args.yaxisHelpText', {
      defaultMessage: 'The axis configuration. When `{false}`, the axis is hidden.',
      values: {
        false: 'false',
      },
    }),
  },
};
