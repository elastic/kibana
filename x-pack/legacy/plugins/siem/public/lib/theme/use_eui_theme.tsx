/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';

import { DEFAULT_DARK_MODE } from '../../../common/constants';
import { useKibanaUiSetting } from '../settings/use_kibana_ui_setting';

export const useEuiTheme = () => {
  const [darkMode] = useKibanaUiSetting(DEFAULT_DARK_MODE);
  return darkMode ? darkTheme : lightTheme;
};
