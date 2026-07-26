/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * Lens-specific styles to ensure chart text uses the numeric font stack.
 */
const lnsNumericFontStyles = ({ euiTheme }: UseEuiTheme) => css`
  font-family: 'Elastic UI Numeric', ${euiTheme.font.family};

  // Some browsers apply user agent styles to form elements (e.g. buttons), which can reset the
  // effective font stack. Force inheritance so numeric glyph fallback works consistently.
  button,
  input,
  select,
  textarea {
    font-family: inherit;
  }
`;

export const lnsExpressionRendererStyle = (euiThemeContext: UseEuiTheme) => {
  return css`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    overflow: auto;
    ${lnsNumericFontStyles(euiThemeContext)}
  `;
};

/**
 * Global styles for portals/popover under Lens.
 * These elements are rendered outside the Lens DOM tree and need global targeting.
 */
export const lnsGlobalChartStyles = (euiThemeContext: UseEuiTheme) => css`
  [id^='echTooltipPortal'] {
    ${lnsNumericFontStyles(euiThemeContext)}
  }
`;
