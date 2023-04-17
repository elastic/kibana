/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { DataTableComponent } from './components/data_table';

export { dataTableActions, dataTableSelectors } from './store/data_table';
export { getTableByIdSelector } from './store/data_table/selectors';
export { dataTableReducer } from './store/data_table/reducer';
export {
  tableDefaults,
  defaultColumnHeaderType,
  defaultHeaders,
} from './store/data_table/defaults';

export type { TableState, DataTableState, TableById } from './store/data_table/types';
export type { DataTableModel, SubsetDataTableModel } from './store/data_table/model';

export {
  Direction,
  tableEntity,
  FILTER_OPEN,
  TimelineTabs,
  TableId,
  TableEntityType,
} from './common/types';
export type {
  TableIdLiteral,
  ViewSelection,
  SortDirectionTable,
  SortColumnTable,
} from './common/types';

export { getColumnHeaders } from './components/data_table/column_headers/helpers';
export {
  getEventIdToDataMapping,
  addBuildingBlockStyle,
  isEventBuildingBlockType,
} from './components/data_table/helpers';
export { getPageRowIndex } from './components/data_table/pagination';
