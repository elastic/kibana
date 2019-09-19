/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, uniq } from 'lodash';
import { legendOptions } from '../../../public/lib/legend_options';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { ViewStrings } from '../../strings';

const { Pie: strings } = ViewStrings;

export const pie = () => ({
  name: 'pie',
  displayName: strings.getDisplayName(),
  modelArgs: [['color', { label: 'Slice Labels' }], ['size', { label: 'Slice Angles' }]],
  args: [
    {
      name: 'palette',
      argType: 'palette',
    },
    {
      name: 'hole',
      displayName: strings.getHoleDisplayName(),
      help: strings.getHoleHelp(),
      argType: 'range',
      default: 50,
      options: {
        min: 0,
        max: 100,
      },
    },
    {
      name: 'labels',
      displayName: strings.getLabelsDisplayName(),
      help: strings.getLabelsHelp(),
      argType: 'toggle',
      default: true,
    },
    {
      name: 'labelRadius',
      displayName: strings.getLabelRadiusDisplayName(),
      help: strings.getLabelRadiusHelp(),
      argType: 'range',
      default: 100,
      options: {
        min: 0,
        max: 100,
      },
    },
    {
      name: 'legend',
      displayName: strings.getLegendDisplayName(),
      help: strings.getLegendHelp(),
      argType: 'select',
      default: 'ne',
      options: {
        choices: legendOptions,
      },
    },
    {
      name: 'radius',
      displayName: strings.getRadiusDisplayName(),
      help: strings.getRadiusHelp(),
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
      displayName: strings.getTiltDisplayName(),
      help: strings.getTiltHelp(),
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
