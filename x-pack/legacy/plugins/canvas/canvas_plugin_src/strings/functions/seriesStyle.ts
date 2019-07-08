/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { seriesStyle } from '../../functions/common/seriesStyle';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof seriesStyle>> = {
  help: i18n.translate('xpack.canvas.functions.seriesStyleHelpText', {
    defaultMessage:
      'Creates an object used for describing the properties of a series on a chart. ' +
      'Use `{seriesStyle}` inside of a charting function, like `{plot}` or `{pie}`.',
    values: {
      seriesStyle: 'seriesStyle',
      pie: 'pie',
      plot: 'plot',
    },
  }),
  args: {
    label: i18n.translate('xpack.canvas.functions.seriesStyle.args.labelHelpText', {
      defaultMessage: 'The name of the series to style.',
    }),
    color: i18n.translate('xpack.canvas.functions.seriesStyle.args.colorHelpText', {
      defaultMessage: 'The line color.',
    }),
    lines: i18n.translate('xpack.canvas.functions.seriesStyle.args.linesHelpText', {
      defaultMessage: 'The width of the line.',
    }),
    bars: i18n.translate('xpack.canvas.functions.seriesStyle.args.barsHelpText', {
      defaultMessage: 'The width of bars.',
    }),
    points: i18n.translate('xpack.canvas.functions.seriesStyle.args.pointsHelpText', {
      defaultMessage: 'Size of points on line',
    }),
    fill: i18n.translate('xpack.canvas.functions.seriesStyle.args.fillHelpText', {
      defaultMessage: 'Should we fill in the points?',
    }),
    stack: i18n.translate('xpack.canvas.functions.seriesStyle.args.stackHelpText', {
      defaultMessage:
        'Specifies if the series should be stacked. ' +
        'The number is the stack ID. ' +
        'Series with the same stack ID are stacked together.',
    }),
    horizontalBars: i18n.translate(
      'xpack.canvas.functions.seriesStyle.args.horizontalBarsHelpText',
      {
        defaultMessage: 'Sets the orientation of the bars in the chart to horizontal.',
      }
    ),
  },
};
