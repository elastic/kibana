/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { SpecId, Theme, LIGHT_THEME, DARK_THEME } from '@elastic/charts';

export const getColorsMap = (color: string, specId: SpecId) => {
  const map = new Map();
  map.set({ colorValues: [], specId }, color);
  return map;
};

export const isDarkMode = () => chrome.getUiSettingsClient().get('theme:darkMode');

export const getChartTheme = (): Theme => {
  return isDarkMode() ? DARK_THEME : LIGHT_THEME;
};
