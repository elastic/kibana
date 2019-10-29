/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import {
  JobCreatorType,
  isMultiMetricJobCreator,
  isPopulationJobCreator,
} from '../../../../common/job_creator';
import { TimeBuckets } from '../../../../../../util/time_buckets';

const IS_DARK_THEME = chrome.getUiSettingsClient().get('theme:darkMode');
const themeName = IS_DARK_THEME ? darkTheme : lightTheme;

export const LINE_COLOR = themeName.euiColorPrimary;
export const MODEL_COLOR = themeName.euiColorPrimary;
export const EVENT_RATE_COLOR = themeName.euiColorPrimary;

export interface ChartSettings {
  width: string;
  height: string;
  cols: 1 | 2 | 3;
  intervalMs: number;
}

export const defaultChartSettings: ChartSettings = {
  width: '100%',
  height: '300px',
  cols: 1,
  intervalMs: 0,
};

export const seriesStyle = {
  line: {
    strokeWidth: 2,
    visible: true,
    opacity: 1,
  },
  border: {
    visible: false,
    strokeWidth: 0,
  },
  point: {
    visible: false,
    radius: 2,
    strokeWidth: 4,
    opacity: 0.5,
  },
  area: {
    opacity: 0.25,
    visible: false,
  },
};

export function getChartSettings(jobCreator: JobCreatorType, chartInterval: TimeBuckets) {
  const cs = {
    ...defaultChartSettings,
    intervalMs: chartInterval.getInterval().asMilliseconds(),
  };

  if (isPopulationJobCreator(jobCreator)) {
    // for population charts, use a larger interval based on
    // the calculation from TimeBuckets, but without the
    // bar target and max bars which have been set for the
    // general chartInterval
    const interval = new TimeBuckets();
    interval.setInterval('auto');
    interval.setBounds(chartInterval.getBounds());
    cs.intervalMs = interval.getInterval().asMilliseconds();
  }

  if (cs.intervalMs < jobCreator.bucketSpanMs) {
    // don't allow the chart interval to be smaller than the bucket span
    cs.intervalMs = jobCreator.bucketSpanMs;
  }

  if (isMultiMetricJobCreator(jobCreator) || isPopulationJobCreator(jobCreator)) {
    if (jobCreator.aggFieldPairs.length > 2 && isMultiMetricJobCreator(jobCreator)) {
      cs.cols = 3;
      cs.height = '150px';
      cs.intervalMs = cs.intervalMs * 3;
    } else if (jobCreator.aggFieldPairs.length > 1) {
      cs.cols = 2;
      cs.height = '200px';
      cs.intervalMs = cs.intervalMs * 2;
    }
  }

  return cs;
}
