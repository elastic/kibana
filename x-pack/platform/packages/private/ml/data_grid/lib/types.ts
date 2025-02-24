/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridPaginationProps,
  EuiDataGridSorting,
  EuiDataGridColumn,
} from '@elastic/eui';

import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import type { FeatureImportanceBaseline } from '@kbn/ml-data-frame-analytics-utils';

import type { INDEX_STATUS } from './common';
import type { ChartData } from './field_histograms';

interface Dictionary<TValue> {
  [id: string]: TValue;
}

/**
 * Type definition for a column id.
 */
export type ColumnId = string;

/**
 * Type definition for a data grid item.
 */
export type DataGridItem = Record<string, any>;

/**
 * Charts visibility state. `undefined` is used to indicate a non-initialized state.
 */
export type ChartsVisible = boolean | undefined;

/**
 * Row count relation for the data grid's number of rows.
 * It's an alias of `estypes.SearchTotalHitsRelation` ("eq" or "gte")
 * that can also be undefined.
 */
export type RowCountRelation = estypes.SearchTotalHitsRelation | undefined;

/**
 * Information about the row count.
 */
export interface RowCountInfo {
  /**
   * Row count.
   */
  rowCount: number;
  /**
   * Row count relation.
   */
  rowCountRelation: RowCountRelation;
}

/**
 * Type representing the pagination settings for an index.
 */
export type IndexPagination = Required<Pick<EuiDataGridPaginationProps, 'pageIndex' | 'pageSize'>>;

/**
 * Type for callback function for changing items per page.
 * @param {*} pageSize - The page size.
 */
export type OnChangeItemsPerPage = (pageSize: number) => void;

/**
 * Type for callback function for changing the current page.
 * @param {*} pageIndex - The page index.
 */
export type OnChangePage = (pageIndex: number) => void;

/**
 * Array of sortings specs.
 */
type SortSettings = Array<{
  id: string;
  direction: 'asc' | 'desc';
}>;

/**
 * Type for callback function for sorting.
 * @param {SortSettings} sortSettings - The sorting.
 */
export type OnSort = (sortSettings: SortSettings) => void;

/**
 * Interface representing the cell value options used for rendering a cell in a data grid.
 */
interface CellValue {
  /**
   * The row index of the cell.
   */
  rowIndex: number;
  /**
   * The column id of the cell.
   */
  columnId: string;
  /**
   * Callback to set cell props
   */
  setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
}

/**
 * Function used to render the cell value in a data grid.
 * @param {CellValue} options - The options for rendering the cell value.
 */
export type RenderCellValue = (options: CellValue) => any;

/**
 * Type representing ES sorting configuration.
 */
export type EsSorting = Dictionary<{
  order: 'asc' | 'desc';
}>;

/**
 * Return type of the `useIndexData` custom hook.
 */
export interface UseIndexDataReturnType
  extends Pick<
    UseDataGridReturnType,
    | 'chartsVisible'
    | 'chartsButtonVisible'
    | 'ccsWarning'
    | 'columnsWithCharts'
    | 'errorMessage'
    | 'invalidSortingColumnns'
    | 'noDataMessage'
    | 'onChangeItemsPerPage'
    | 'onChangePage'
    | 'onSort'
    | 'pagination'
    | 'setPagination'
    | 'setVisibleColumns'
    | 'rowCount'
    | 'rowCountRelation'
    | 'sortingColumns'
    | 'status'
    | 'tableItems'
    | 'toggleChartVisibility'
    | 'visibleColumns'
    | 'baseline'
    | 'predictionFieldName'
    | 'resultsField'
  > {
  /**
   * Callback to render cell values.
   */
  renderCellValue: RenderCellValue;
  /**
   * Optional data view fields.
   */
  dataViewFields?: string[];
  /**
   * Optional time range.
   */
  timeRangeMs?: TimeRangeMs;
}

/**
 * Return type of the `useDataGrid` custom hook.
 */
export interface UseDataGridReturnType {
  /**
   * Boolean flag for CCS warning.
   */
  ccsWarning: boolean;
  /**
   * Boolean flag for charts visibility.
   */
  chartsVisible: ChartsVisible;
  /**
   * Boolean flag for charts button visibily.
   */
  chartsButtonVisible: boolean;
  /**
   * Array of columns with charts data.
   */
  columnsWithCharts: EuiDataGridColumn[];
  /**
   * Error message.
   */
  errorMessage: string;
  /**
   * Array of invalid sorting columns.
   */
  invalidSortingColumnns: ColumnId[];
  /**
   * No data message.
   */
  noDataMessage: string;
  /**
   * Callback function for changing the number of items per page.
   */
  onChangeItemsPerPage: OnChangeItemsPerPage;
  /**
   * Callback function for handling change of current page.
   */
  onChangePage: OnChangePage;
  /**
   * Callback function for handling sort.
   */
  onSort: OnSort;
  /**
   * Index pagination information.
   */
  pagination: IndexPagination;
  /**
   * Function to reset pagination.
   */
  resetPagination: () => void;
  /**
   * Row count.
   */
  rowCount: number;
  /**
   * Row count relation.
   */
  rowCountRelation: RowCountRelation;
  /**
   * Setter function for the CCS warning flag.
   */
  setCcsWarning: Dispatch<SetStateAction<boolean>>;
  /**
   * Setter function for the column charts.
   */
  setColumnCharts: Dispatch<SetStateAction<ChartData[]>>;
  /**
   * Setter function for the error message.
   */
  setErrorMessage: Dispatch<SetStateAction<string>>;
  /**
   * Setter function for the no data message.
   */
  setNoDataMessage: Dispatch<SetStateAction<string>>;
  /**
   * Setter function for pagination.
   */
  setPagination: Dispatch<SetStateAction<IndexPagination>>;
  /**
   * Setter function for the row count info.
   */
  setRowCountInfo: (info: RowCountInfo) => void;
  /**
   * Setter function for the sorting columns.
   */
  setSortingColumns: Dispatch<SetStateAction<EuiDataGridSorting['columns']>>;
  /**
   * Setter function for the index status.
   */
  setStatus: Dispatch<SetStateAction<INDEX_STATUS>>;
  /**
   * Setter function for the table items.
   */
  setTableItems: Dispatch<SetStateAction<DataGridItem[]>>;
  /**
   * Setter function for the visible columns.
   */
  setVisibleColumns: Dispatch<SetStateAction<ColumnId[]>>;
  /**
   * Sorting columns.
   */
  sortingColumns: EuiDataGridSorting['columns'];
  /**
   * Index status.
   */
  status: INDEX_STATUS;
  /**
   * Table items.
   */
  tableItems: DataGridItem[];
  /**
   * Function to toggle chart visibility.
   */
  toggleChartVisibility: () => void;
  /**
   * Array of visible columns.
   */
  visibleColumns: ColumnId[];
  /**
   * Optional feature importance baseline.
   */
  baseline?: FeatureImportanceBaseline;
  /**
   * Optional prediction field name.
   */
  predictionFieldName?: string;
  /**
   * Optional results field.
   */
  resultsField?: string;
}
