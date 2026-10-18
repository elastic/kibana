/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridStyle,
} from '@elastic/eui';

/**
 * Props passed to the cell renderers. They extend the EuiDataGrid ones, so renderers written for
 * EuiDataGrid can be reused as they are.
 */
export type TanStackCellValueProps = EuiDataGridCellValueElementProps & {
  /** Index of the row on the current page. */
  visibleRowIndex: number;
};

/**
 * A grid that accepts the subset of the EuiDataGrid props used by the Lens table,
 * so both grids can be swapped without changing the code producing the props.
 */
export interface TanStackDatatableGridProps {
  'aria-label': string;
  'data-test-subj'?: string;
  /** Visible data columns, in display order. */
  columns: EuiDataGridColumn[];
  leadingControlColumns?: EuiDataGridControlColumn[];
  trailingControlColumns?: EuiDataGridControlColumn[];
  /** Number of rows of the whole data set, across all pages. */
  rowCount: number;
  /** Rendered as a component, so it can use hooks. `rowIndex` includes the pagination offset. */
  renderCellValue: ComponentType<TanStackCellValueProps>;
  rowHeightsOptions?: {
    /** `auto` fits rows to their content, `lineCount` clamps the content to a number of lines. */
    defaultHeight?: 'auto' | { lineCount: number };
  };
  gridStyle?: EuiDataGridStyle;
}

export type GridColumnKind = 'leading' | 'data' | 'trailing';

/** A column of the grid, unifying control columns and data columns. */
export interface GridColumnModel {
  id: string;
  kind: GridColumnKind;
  /** 1-based, matches `aria-colindex`. */
  ariaColIndex: number;
  /** Index among the data columns, undefined for control columns. */
  dataColIndex?: number;
  /** Width in px that users cannot change, for control columns. */
  fixedWidth?: number;
  column?: EuiDataGridColumn;
  control?: EuiDataGridControlColumn;
}
