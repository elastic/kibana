/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  css,
  euiStyled,
  EuiTheme,
  EuiThemeProvider,
  createGlobalStyle,
  keyframes,
  withTheme,
} from './eui_styled_components';

export { css, euiStyled, EuiTheme, EuiThemeProvider, createGlobalStyle, keyframes, withTheme };
// In order to to mimic the styled-components module we need to ignore the following
// eslint-disable-next-line import/no-default-export
export default euiStyled;
