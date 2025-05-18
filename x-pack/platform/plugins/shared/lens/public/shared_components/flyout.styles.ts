/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseEuiTheme, euiShadow, euiThemeCssVariables } from '@elastic/eui';
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
  border-left: ${euiThemeCssVariables.border.thin};
  ${euiShadow(euiThemeContext, 'xl')};
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  height: 100%;
  z-index: ${euiThemeCssVariables.levels.flyout};
  background: ${euiThemeCssVariables.colors.backgroundBasePlain};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  animation: ${flyoutOpenCloseAnimation} ${euiThemeCssVariables.animation.normal}
    ${euiThemeCssVariables.animation.resistance};
  .lnsIndexPatternDimensionEditor--padded {
    padding: ${euiThemeCssVariables.size.base};
  }
  .lnsIndexPatternDimensionEditor--collapseNext {
    margin-bottom: calc(-${euiThemeCssVariables.size.l});
    border-top: ${euiThemeCssVariables.border.thin};
    margin-top: 0 !important;
  }
`;
