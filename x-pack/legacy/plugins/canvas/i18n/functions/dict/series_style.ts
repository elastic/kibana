/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { seriesStyle } from '../../../canvas_plugin_src/functions/common/seriesStyle';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';

export const help: FunctionHelp<FunctionFactory<typeof seriesStyle>> = {
  help: i18n.translate('xpack.canvas.functions.seriesStyleHelpText', {
    defaultMessage:
      'Creates an object used for describing the properties of a series on a chart. ' +
      'Use {seriesStyleFn} inside of a charting function, like {plotFn} or {pieFn}.',
    values: {
      seriesStyleFn: '`seriesStyle`',
      pieFn: '`pie`',
      plotFn: '`plot`',
    },
  }),
  args: {
    bars: i18n.translate('xpack.canvas.functions.seriesStyle.args.barsHelpText', {
      defaultMessage: 'The width of bars.',
    }),
    color: i18n.translate('xpack.canvas.functions.seriesStyle.args.colorHelpText', {
      defaultMessage: 'The line color.',
    }),
    fill: i18n.translate('xpack.canvas.functions.seriesStyle.args.fillHelpText', {
      defaultMessage: 'Should we fill in the points?',
    }),
    horizontalBars: i18n.translate(
      'xpack.canvas.functions.seriesStyle.args.horizontalBarsHelpText',
      {
        defaultMessage: 'Sets the orientation of the bars in the chart to horizontal.',
      }
    ),
    label: i18n.translate('xpack.canvas.functions.seriesStyle.args.labelHelpText', {
      defaultMessage: 'The name of the series to style.',
    }),
    lines: i18n.translate('xpack.canvas.functions.seriesStyle.args.linesHelpText', {
      defaultMessage: 'The width of the line.',
    }),
    points: i18n.translate('xpack.canvas.functions.seriesStyle.args.pointsHelpText', {
      defaultMessage: 'Size of points on line',
    }),
    stack: i18n.translate('xpack.canvas.functions.seriesStyle.args.stackHelpText', {
      defaultMessage:
        'Specifies if the series should be stacked. The number is the stack ID. ' +
        'Series with the same stack ID are stacked together.',
    }),
  },
};
