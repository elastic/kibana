/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, uniq } from 'lodash';
import { legendOptions } from '../../../public/lib/legend_options';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { ViewStrings } from '../../strings';

export const pie = () => ({
  name: 'pie',
  displayName: ViewStrings.Pie.getDisplayName(),
  modelArgs: [['color', { label: 'Slice Labels' }], ['size', { label: 'Slice Angles' }]],
  args: [
    {
      name: 'palette',
      argType: 'palette',
    },
    {
      name: 'hole',
      displayName: ViewStrings.Pie.args.hole.getDisplayName(),
      help: ViewStrings.Pie.args.hole.getHelp(),
      argType: 'range',
      default: 50,
      options: {
        min: 0,
        max: 100,
      },
    },
    {
      name: 'labels',
      displayName: ViewStrings.Pie.args.labels.getDisplayName(),
      help: ViewStrings.Pie.args.labels.getHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'labelRadius',
      displayName: ViewStrings.Pie.args.labelRadius.getDisplayName(),
      help: ViewStrings.Pie.args.labelRadius.getHelp(),
      argType: 'range',
      default: 100,
      options: {
        min: 0,
        max: 100,
      },
    },
    {
      name: 'legend',
      displayName: ViewStrings.Pie.args.legend.getDisplayName(),
      help: ViewStrings.Pie.args.legend.getHelp(),
      argType: 'select',
      default: 'ne',
      options: {
        choices: legendOptions,
      },
    },
    {
      name: 'radius',
      displayName: ViewStrings.Pie.args.radius.getDisplayName(),
      help: ViewStrings.Pie.args.radius.getHelp(),
      argType: 'percentage',
      default: 1,
    },
    {
      name: 'seriesStyle',
      argType: 'seriesStyle',
      multi: true,
    },
    {
      name: 'font',
      argType: 'font',
    },
    {
      name: 'tilt',
      displayName: ViewStrings.Pie.args.tilt.getDisplayName(),
      help: ViewStrings.Pie.args.tilt.getHelp(),
      argType: 'percentage',
      default: 1,
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') {
      return { labels: [] };
    }
    return { labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)) };
  },
});
