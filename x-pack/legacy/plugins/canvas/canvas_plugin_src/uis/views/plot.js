/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, uniq } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { legendOptions } from '../../../public/lib/legend_options';
import { ViewStrings } from '../../strings';

const styleProps = ['lines', 'bars', 'points', 'fill', 'stack'];

export const plot = () => ({
  name: 'plot',
  displayName: ViewStrings.Plot.getDisplayName(),
  modelArgs: ['x', 'y', 'color', 'size', 'text'],
  args: [
    {
      name: 'palette',
      argType: 'palette',
    },
    {
      name: 'legend',
      displayName: ViewStrings.Plot.args.legend.getDisplayName(),
      help: ViewStrings.Plot.args.legend.getHelp(),
      argType: 'select',
      default: 'ne',
      options: {
        choices: legendOptions,
      },
    },
    {
      name: 'xaxis',
      displayName: ViewStrings.Plot.args.xaxis.getDisplayName(),
      help: ViewStrings.Plot.args.xaxis.getHelp(),
      argType: 'axisConfig',
      default: true,
    },
    {
      name: 'yaxis',
      displayName: ViewStrings.Plot.args.yaxis.getDisplayName(),
      help: ViewStrings.Plot.args.yaxis.getHelp(),
      argType: 'axisConfig',
      default: true,
    },
    {
      name: 'font',
      argType: 'font',
    },
    {
      name: 'defaultStyle',
      displayName: ViewStrings.Plot.args.defaultStyle.getDisplayName(),
      help: ViewStrings.Plot.args.defaultStyle.getHelp(),
      argType: 'seriesStyle',
      default: '{seriesStyle points=5}',
      options: {
        include: styleProps,
      },
    },
    {
      name: 'seriesStyle',
      argType: 'seriesStyle',
      options: {
        include: styleProps,
      },
      multi: true,
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') {
      return { labels: [] };
    }
    return { labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)) };
  },
});
