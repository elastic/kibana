/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';
import { CHART_TEXT_COLOR } from '../../../common/constants';
import chrome from '../../../../../../../src/legacy/ui/public/chrome';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
const isDarkMode = chrome.getUiSettingsClient().get('theme:darkMode');

export const euiColorForTheme = euiColor => {
  if (isDarkMode) {
    return euiDarkVars[euiColor];
  }
  return euiLightVars[euiColor];
};

export function getChartOptions(axisOptions) {
  const opts = {
    legend: {
      show: false,
    },
    xaxis: {
      color: euiColorForTheme('euiBorderColor'),
      timezone: 'browser',
      mode: 'time', // requires `time` flot plugin
      font: {
        color: CHART_TEXT_COLOR,
      },
    },
    yaxis: {
      color: euiColorForTheme('euiBorderColor'),
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
      borderColor: euiColorForTheme('euiBorderColor'),
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
