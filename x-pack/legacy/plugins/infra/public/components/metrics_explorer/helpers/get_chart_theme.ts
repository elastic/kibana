/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { Theme, LIGHT_THEME, DARK_THEME } from '@elastic/charts';

export function getChartTheme(): Theme {
  const isDarkMode = chrome.getUiSettingsClient().get('theme:darkMode');
  return isDarkMode ? DARK_THEME : LIGHT_THEME;
}
