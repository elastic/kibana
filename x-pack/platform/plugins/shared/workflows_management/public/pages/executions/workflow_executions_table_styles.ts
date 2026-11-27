/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { EXECUTIONS_TABLE_MIN_WIDTH_PX } from './workflow_executions_table_config';

export const getWorkflowExecutionsTableGridWrapperCss = (themeContext: UseEuiTheme) => {
  const { euiTheme } = themeContext;

  return css`
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    overflow-x: auto;

    .euiDataGrid {
      width: 100%;
      min-width: ${EXECUTIONS_TABLE_MIN_WIDTH_PX}px;
    }

    .euiDataGrid__leftControls {
      flex-wrap: nowrap;
    }

    .euiDataGridHeader,
    .euiDataGridHeaderCell {
      background-color: ${euiTheme.components.dataGridRowBackground} !important;
    }

    .euiDataGridHeader {
      border-bottom: ${euiTheme.border.width.thick} solid ${euiTheme.colors.text} !important;
    }

    .workflowExecutionsGrid__selectionHeaderCell > [data-focus-lock-disabled] {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .euiDataGridRowCell--controlColumn .euiDataGridRowCell__content--defaultHeight {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .euiDataGridRowCell:not(.euiDataGridRowCell--controlColumn)
      .euiDataGridRowCell__content--defaultHeight {
      display: flex;
      align-items: center;
    }

    .euiDataGridRowCell[data-gridcell-column-id='duration']
      .euiDataGridRowCell__content--defaultHeight {
      justify-content: flex-end;
    }

    .workflowExecutionsTableRow--selected .euiDataGridRowCell {
      background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect} !important;
    }
  `;
};
