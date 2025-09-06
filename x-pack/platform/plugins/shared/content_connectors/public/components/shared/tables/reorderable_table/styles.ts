/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { type EuiThemeComputed } from '@elastic/eui';

export const reorderableTableStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  /* Header */
  .reorderableTableHeader > .euiFlexGroup {
    margin: ${euiTheme.size.xs} 0;
  }

  /* No items */
  .reorderableTableNoItems {
    border-top: ${euiTheme.border.thin};
    background-color: ${euiTheme.colors.emptyShade};
  }

  /* Row */
  .reorderableTableRow {
    border-top: ${euiTheme.border.thin};
    background-color: ${euiTheme.colors.emptyShade};

    > .euiFlexGroup > .euiFlexItem {
      margin: ${euiTheme.size.m} 0;
    }
  }

  /* Disabled draggable */
  .euiDraggable .euiDraggable__item.euiDraggable__item--isDisabled {
    cursor: unset;
  }

  /* Unorderable rows */
  .unorderableRows .reorderableTableRow {
    background-color: ${euiTheme.colors.lightestShade};
  }
`;
