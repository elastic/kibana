/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useStyles as useSharedStyles } from './styles';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const sharedStyles = useSharedStyles();

  return {
    // Import shared styles
    ...sharedStyles,

    // Component-specific style only used in this component
    panelBody: css`
      margin-top: ${euiTheme.size.s};
      margin-left: ${euiTheme.size.l};
    `,

    // Table header styling
    tvHeader: css`
      ${useEuiFontSize('xs')}
      color: ${euiTheme.colors.darkShade};
      display: table;
      width: 100%;
      table-layout: fixed;
    `,
  };
};
