/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * OpenType font features for improved numeric readability in charts.
 * - `tnum` (tabular-nums): Fixed-width numbers for aligned columns
 * - `zero` (slashed-zero): Distinguishes zero from letter O
 * - `ss01`: Open digits stylistic set
 * - `ss07`: Squared punctuation stylistic set
 *
 * @see https://github.com/elastic/kibana/issues/249382
 */
const numericFontFeatures = css`
  font-feature-settings: 'tnum', 'zero', 'ss01', 'ss07';
  font-variant-numeric: tabular-nums slashed-zero;

  // Override user agent form element font features inheritance
  button,
  input,
  select,
  textarea {
    font-variant-numeric: inherit;
    font-feature-settings: inherit;
  }
`;

export const lnsExpressionRendererStyle = (euiThemeContext: UseEuiTheme) => {
  return css`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    overflow: auto;
    ${numericFontFeatures}
  `;
};

/**
 * Global styles for elastic-charts elements rendered via portals (tooltips, annotations).
 * These elements are rendered outside the Lens DOM tree and need global targeting.
 */
export const lnsGlobalChartStyles = css`
  [id^='echTooltipPortal'] {
    ${numericFontFeatures}
  }
`;
