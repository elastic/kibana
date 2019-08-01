/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';

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
    stroke: '',
    strokeWidth: 2,
    visible: true,
    opacity: 1,
  },
  border: {
    visible: false,
    strokeWidth: 0,
    stroke: '',
  },
  point: {
    visible: false,
    radius: 2,
    stroke: '',
    strokeWidth: 4,
    opacity: 0.5,
  },
  area: {
    fill: '',
    opacity: 0.25,
    visible: false,
  },
};
