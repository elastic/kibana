/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseEuiTheme, euiShadow } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

const flyoutOpenCloseAnimation = keyframes`
  0% {
    opacity: 0;
    transform: translateX(100%);
  }
  75% {
    opacity: 1;
    transform: translateX(0%);
  }
`;

export const flyoutContainerStyles = (euiThemeContext: UseEuiTheme) => css`
  border-left: ${euiThemeContext.euiTheme.border.thin};
  ${euiShadow(euiThemeContext, 'xl')};
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  height: 100%;
  z-index: ${euiThemeContext.euiTheme.levels.flyout};
  background: ${euiThemeContext.euiTheme.colors.backgroundBasePlain};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  animation: ${flyoutOpenCloseAnimation} ${euiThemeContext.euiTheme.animation.normal}
    ${euiThemeContext.euiTheme.animation.resistance};
  .lnsIndexPatternDimensionEditor--padded {
    padding: ${euiThemeContext.euiTheme.size.base};
  }
  .lnsIndexPatternDimensionEditor--collapseNext {
    margin-bottom: -${euiThemeContext.euiTheme.size.l};
    border-top: ${euiThemeContext.euiTheme.border.thin};
    margin-top: 0 !important;
  }
`;
