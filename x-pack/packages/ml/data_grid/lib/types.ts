/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, SetStateAction } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EuiDataGridCellValueElementProps,
  EuiDataGridPaginationProps,
  EuiDataGridSorting,
  EuiDataGridColumn,
} from '@elastic/eui';

import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import { FeatureImportanceBaseline, INDEX_STATUS } from '@kbn/ml-data-frame-analytics-utils';

import { ChartData } from './field_histograms';

interface Dictionary<TValue> {
  [id: string]: TValue;
}

/**
 * Type definition for a column id.
 * @typedef {DataGridItem}
 */
export type ColumnId = string;

/**
 * Type definition for a data grid item.
 * @typedef {DataGridItem}
 */
export type DataGridItem = Record<string, any>;

/**
 * Charts visibility state.
 * `undefined` is used to indicate a non-initialized state.
 * @typedef {ChartsVisible}
 */
export type ChartsVisible = boolean | undefined;

/**
 * Row count relation.
 * @typedef {RowCountRelation}
 */
export type RowCountRelation = estypes.SearchTotalHitsRelation | undefined;

/**
 * Information about the row count.
 * @export
 * @interface RowCountInfo
 * @typedef {RowCountInfo}
 */
export interface RowCountInfo {
  /**
   * Row count.
   * @type {number}
   */
  rowCount: number;
  /**
   * Row count relation.
   * @type {RowCountRelation}
   */
  rowCountRelation: RowCountRelation;
}

/**
 * Type representing the pagination settings for an index.
 * @export
 * @typedef {IndexPagination}
 */
export type IndexPagination = Pick<EuiDataGridPaginationProps, 'pageIndex' | 'pageSize'>;

/**
 * Type for callback function for changing items per page.
 * @param {*} pageSize - The page size.
 * @export
 * @typedef {OnChangeItemsPerPage}
 */
export type OnChangeItemsPerPage = (pageSize: number) => void;

/**
 * Type for callback function for changing the current page.
 * @param {*} pageIndex - The page index.
 * @export
 * @typedef {OnChangePage}
 */
export type OnChangePage = (pageIndex: number) => void;

/**
 * Array of sortings specs.
 * @typedef {SortSettings}
 */
type SortSettings = Array<{
  id: string;
  direction: 'asc' | 'desc';
}>;

/**
 * Type for callback function for sorting.
 * @param {SortSettings} sortSettings - The sorting.
 * @export
 * @typedef {OnSort}
 */
export type OnSort = (sortSettings: SortSettings) => void;

/**
 * Interface representing the cell value options used for rendering a cell in a data grid.
 * @interface CellValue
 * @typedef {CellValue}
 */
interface CellValue {
  /**
   * The row index of the cell.
   * @type {number}
   */
  rowIndex: number;
  /**
   * The column id of the cell.
   * @type {string}
   */
  columnId: string;
  /**
   * Callback to set cell props
   * @type {EuiDataGridCellValueElementProps['setCellProps']}
   */
  setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
}

/**
 * Function used to render the cell value in a data grid.
 * @typedef {Function} RenderCellValue
 * @param {CellValue} options - The options for rendering the cell value.
 * @export
 */
export type RenderCellValue = (options: CellValue) => any;

/**
 * Type representing ES sorting configuration.
 * @export
 * @typedef {EsSorting}
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
   * @type {RenderCellValue}
   */
  renderCellValue: RenderCellValue;
  /**
   * Optional index pattern fields.
   * @type {?string[]}
   */
  indexPatternFields?: string[];
  /**
   * Optional time range.
   * @type {?TimeRangeMs}
   */
  timeRangeMs?: TimeRangeMs;
}

/**
 * Return type of the `useDataGrid` custom hook.
 * @export
 * @interface UseDataGridReturnType
 * @typedef {UseDataGridReturnType}
 */
export interface UseDataGridReturnType {
  /**
   * Boolean flag for CCS warning.
   * @type {boolean}
   */
  ccsWarning: boolean;
  /**
   * Boolean flag for charts visibility.
   * @type {ChartsVisible}
   */
  chartsVisible: ChartsVisible;
  /**
   * Boolean flag for charts button visibily.
   * @type {boolean}
   */
  chartsButtonVisible: boolean;
  /**
   * Array of columns with charts data.
   * @type {EuiDataGridColumn[]}
   */
  columnsWithCharts: EuiDataGridColumn[];
  /**
   * Error message.
   * @type {string}
   */
  errorMessage: string;
  /**
   * Array of invalid sorting columns.
   * @type {ColumnId[]}
   */
  invalidSortingColumnns: ColumnId[];
  /**
   * No data message.
   * @type {string}
   */
  noDataMessage: string;
  /**
   * Callback function for changing the number of items per page.
   * @type {OnChangeItemsPerPage}
   */
  onChangeItemsPerPage: OnChangeItemsPerPage;
  /**
   * Callback function for handling change of current page.
   * @type {OnChangePage}
   */
  onChangePage: OnChangePage;
  /**
   * Callback function for handling sort.
   * @type {OnSort}
   */
  onSort: OnSort;
  /**
   * Index pagination information.
   * @type {IndexPagination}
   */
  pagination: IndexPagination;
  /**
   * Function to reset pagination.
   * @type {() => void}
   */
  resetPagination: () => void;
  /**
   * Row count.
   * @type {number}
   */
  rowCount: number;
  /**
   * Row count relation.
   * @type {RowCountRelation}
   */
  rowCountRelation: RowCountRelation;
  /**
   * Setter function for the CCS warning flag.
   * @type {Dispatch<SetStateAction<boolean>>}
   */
  setCcsWarning: Dispatch<SetStateAction<boolean>>;
  /**
   * Setter function for the column charts.
   * @type {Dispatch<SetStateAction<ChartData[]>>}
   */
  setColumnCharts: Dispatch<SetStateAction<ChartData[]>>;
  /**
   * Setter function for the error message.
   * @type {Dispatch<SetStateAction<string>>}
   */
  setErrorMessage: Dispatch<SetStateAction<string>>;
  /**
   * Setter function for the no data message.
   * @type {Dispatch<SetStateAction<string>>}
   */
  setNoDataMessage: Dispatch<SetStateAction<string>>;
  /**
   * Setter function for pagination.
   * @type {Dispatch<SetStateAction<IndexPagination>>}
   */
  setPagination: Dispatch<SetStateAction<IndexPagination>>;
  /**
   * Setter function for the row count info.
   * @type {Dispatch<SetStateAction<RowCountInfo>>}
   */
  setRowCountInfo: Dispatch<SetStateAction<RowCountInfo>>;
  /**
   * Setter function for the sorting columns.
   * @type {Dispatch<SetStateAction<EuiDataGridSorting['columns']>>}
   */
  setSortingColumns: Dispatch<SetStateAction<EuiDataGridSorting['columns']>>;
  /**
   * Setter function for the index status.
   * @type {Dispatch<SetStateAction<INDEX_STATUS>>}
   */
  setStatus: Dispatch<SetStateAction<INDEX_STATUS>>;
  /**
   * Setter function for the table items.
   * @type {Dispatch<SetStateAction<DataGridItem[]>>}
   */
  setTableItems: Dispatch<SetStateAction<DataGridItem[]>>;
  /**
   * Setter function for the visible columns.
   * @type {Dispatch<SetStateAction<ColumnId[]>>}
   */
  setVisibleColumns: Dispatch<SetStateAction<ColumnId[]>>;
  /**
   * Sorting columns.
   * @type {EuiDataGridSorting['columns']}
   */
  sortingColumns: EuiDataGridSorting['columns'];
  /**
   * Index status.
   * @type {INDEX_STATUS}
   */
  status: INDEX_STATUS;
  /**
   * Table items.
   * @type {DataGridItem[]}
   */
  tableItems: DataGridItem[];
  /**
   * Function to toggle chart visibility.
   * @type {() => void}
   */
  toggleChartVisibility: () => void;
  /**
   * Array of visible columns.
   * @type {ColumnId[]}
   */
  visibleColumns: ColumnId[];
  /**
   * Optional feature importance baseline.
   * @type {?FeatureImportanceBaseline}
   */
  baseline?: FeatureImportanceBaseline;
  /**
   * Optional prediction field name.
   * @type {?FeatureImportanceBaseline}
   */
  predictionFieldName?: string;
  /**
   * Optional results field.
   * @type {?FeatureImportanceBaseline}
   */
  resultsField?: string;
}
