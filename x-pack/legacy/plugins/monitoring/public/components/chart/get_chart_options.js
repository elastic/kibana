/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { merge } from 'lodash';
import { CHART_LINE_COLOR, CHART_TEXT_COLOR } from '../../../common/constants';

export async function getChartOptions(axisOptions) {
  const $injector = await chrome.dangerouslyGetActiveInjector();
  const timezone = $injector.get('config').get('dateFormat:tz');
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
