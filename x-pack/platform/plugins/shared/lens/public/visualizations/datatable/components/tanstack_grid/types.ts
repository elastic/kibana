/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, ReactNode } from 'react';
import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  EuiDataGridControlColumn,
  EuiDataGridSorting,
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
  /** Controlled, the grid does not sort rows itself: it renders `onSort` triggers in the header menu. */
  sorting?: EuiDataGridSorting;
  pagination?: TanStackGridPagination;
  /** Called once when a user finishes resizing a column. */
  onColumnResize?: (data: { columnId: string; width: number }) => void;
  /** Rendered in a summary row below the data, when provided. */
  renderFooterCellValue?: ComponentType<{ columnId: string; colIndex: number }>;
  /**
   * Called after the grid has rendered its rows, and again whenever the rendered data changes.
   * It replaces guessing when EuiDataGrid is done rendering with a timeout.
   */
  onRender?: () => void;
  /** Replaces the content of the popover opened by expanding a cell. */
  renderCellPopover?: ComponentType<TanStackCellPopoverProps>;
}

export interface TanStackCellPopoverProps {
  rowIndex: number;
  colIndex: number;
  columnId: string;
  schema?: string | null;
  /** The cell value, rendered for the popover. */
  children: ReactNode;
  /** The cell actions of the column as buttons, undefined when the column has none. */
  cellActions?: ReactNode;
}

export interface TanStackGridPagination {
  pageIndex: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onChangeItemsPerPage: (pageSize: number) => void;
  onChangePage: (pageIndex: number) => void;
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
