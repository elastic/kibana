/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const emptyStateStyles = css`
  .euiTableRow {
    &:hover {
      background-color: transparent;
    }

    .euiTableRowCell {
      border-block-end: none;
    }
  }
`;

const populatedBaseStyles = ({ euiTheme }: UseEuiTheme) => css`
  border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
  table {
    background-color: transparent;
  }
`;

const expandableRowStyles = ({ euiTheme }: UseEuiTheme) => css`
  .euiTableRow-isExpandable {
    background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};

    &.euiTableRow-isSelected:hover + .euiTableRow-isExpandedRow {
      background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect};
    }
  }

  .euiTableRow-isExpandedRow > td > .euiTableCellContent {
    padding-block-end: 0;
  }
`;

export const flatTableStyles = (hasRows: boolean) => (theme: UseEuiTheme) =>
  hasRows ? populatedBaseStyles(theme) : emptyStateStyles;

export const groupedTableStyles = (hasRows: boolean) => (theme: UseEuiTheme) =>
  hasRows ? [populatedBaseStyles(theme), expandableRowStyles(theme)] : emptyStateStyles;
