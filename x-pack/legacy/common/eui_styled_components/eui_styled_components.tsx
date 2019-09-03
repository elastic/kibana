/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as styledComponents from 'styled-components';
import { ThemedStyledComponentsModule, ThemeProvider, ThemeProviderProps } from 'styled-components';

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

export interface EuiTheme {
  eui: typeof euiLightVars | typeof euiDarkVars;
  darkMode: boolean;
}

const EuiThemeProvider = <T extends any>({
  darkMode = false,
  ...otherProps
}: ThemeProviderProps<T & EuiTheme> & {
  darkMode?: boolean;
  children?: React.ReactNode;
}) => (
  <ThemeProvider
    {...otherProps}
    theme={() => ({
      eui: darkMode ? euiDarkVars : euiLightVars,
      darkMode,
    })}
  />
);

const {
  default: euiStyled,
  css,
  injectGlobal,
  keyframes,
  withTheme,
} = styledComponents as ThemedStyledComponentsModule<EuiTheme>;

export { css, euiStyled, EuiThemeProvider, injectGlobal, keyframes, withTheme };
