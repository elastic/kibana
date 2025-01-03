/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Legacy } from '../../legacy_shims';
import { merge } from 'lodash';
import { CHART_LINE_COLOR, CHART_TEXT_COLOR } from '../../../common/constants';

export async function getChartOptions(axisOptions) {
  const timezone = Legacy.shims.uiSettings?.get('dateFormat:tz');

  const opts = {
    legend: {
      show: false,
    },
    xaxis: {
      color: CHART_LINE_COLOR,
      timezone: timezone === 'Browser' ? 'browser' : 'utc',
      mode: 'time', // requires `time` flot plugin
      font: {
        color: CHART_TEXT_COLOR,
      },
    },
    yaxis: {
      color: CHART_LINE_COLOR,
      font: {
        color: CHART_TEXT_COLOR,
      },
    },
    series: {
      points: {
        show: true,
        radius: 1,
      },
      lines: {
        show: true,
        lineWidth: 2,
      },
      shadowSize: 0,
    },
    grid: {
      margin: 0,
      borderWidth: 1,
      borderColor: CHART_LINE_COLOR,
      hoverable: true,
    },
    crosshair: {
      // requires `crosshair` flot plugin
      mode: 'x',
      color: '#c66',
      lineWidth: 2,
    },
    selection: {
      // requires `selection` flot plugin
      mode: 'x',
      color: CHART_TEXT_COLOR,
    },
  };

  return merge(opts, axisOptions);
}
