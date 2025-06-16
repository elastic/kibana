/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const lnsExpressionRendererStyle = (euiThemeContext: UseEuiTheme) => {
  return css`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    overflow: auto;
  `;
};
