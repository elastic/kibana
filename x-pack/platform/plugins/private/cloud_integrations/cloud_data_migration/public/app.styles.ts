/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiThemeComputed } from '@elastic/eui';

export const getAppStyles = (euiTheme: EuiThemeComputed) => {
  return {
    listItemCss: css`
      font-weight: ${euiTheme.font.weight.light};
    `,
    panelCss: css`
      padding: calc(${euiTheme.size.xxxl});
      margin: ${euiTheme.size.l} auto;
      width: 100%;
      max-width: 875px;
    `,
    illustrationCss: css`
      max-width: 75%;
    `,
    layoutCss: css`
      max-width: 500px;
      margin: 0 auto;
    `,
  };
};
