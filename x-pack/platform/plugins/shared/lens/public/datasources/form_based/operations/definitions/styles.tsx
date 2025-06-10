/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiFontSize, euiTextBreakWord, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const draggablePopoverButtonStyles = (euiThemeContext: UseEuiTheme) => {
  return css`
    ${euiTextBreakWord()};
    ${euiFontSize(euiThemeContext, 's')};
    min-height: ${euiThemeContext.euiTheme.size.xl};
    width: 100%;
  `;
};
