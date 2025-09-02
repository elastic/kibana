/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { css as cssString } from '@emotion/css';

import { type EuiThemeComputed } from '@elastic/eui';

export const resultField = (euiTheme: EuiThemeComputed<{}>) => css`
  padding: 0;
  border-bottom: 1px solid ${euiTheme.colors.lightShade};
  position: relative;

  &:last-child {
    border-bottom: none;
  }

  > .euiTableRow:hover {
    background-color: ${euiTheme.colors.emptyShade};
  }

  > .euiTableRowCell {
    border-top: none;
    border-bottom: none;

    > .euiTableCellContent {
      padding: ${euiTheme.size.s};
      font-family: ${euiTheme.font.familyCode};
      color: ${euiTheme.colors.mediumShade};
    }
  }

  .denseVectorFieldValue {
    position: absolute;
    right: 0;
    top: $euiSizeS;
    background-color: $euiColorEmptyShade;
    padding: 0 $euiSizeS;
  }
`;

export const resultHeader = (euiTheme: EuiThemeComputed<{}>) => cssString`
  padding: 0 ${euiTheme.size.s} ${euiTheme.size.xs} 0;
`;
