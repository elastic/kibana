/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn, RenderCellValue } from '@elastic/eui';
import React from 'react';
import { LogCategory } from '../../types';
import {
  LogCategoriesGridChangeTimeCell,
  LogCategoriesGridChangeTimeCellDependencies,
  logCategoriesGridChangeTimeColumn,
} from './log_categories_grid_change_time_cell';
import {
  LogCategoriesGridChangeTypeCell,
  logCategoriesGridChangeTypeColumn,
} from './log_categories_grid_change_type_cell';
import {
  LogCategoriesGridCountCell,
  logCategoriesGridCountColumn,
} from './log_categories_grid_count_cell';
import {
  LogCategoriesGridHistogramCell,
  LogCategoriesGridHistogramCellDependencies,
  logCategoriesGridHistoryColumn,
} from './log_categories_grid_histogram_cell';
import {
  LogCategoriesGridPatternCell,
  logCategoriesGridPatternColumn,
} from './log_categories_grid_pattern_cell';

export interface LogCategoriesGridCellContext {
  dependencies: LogCategoriesGridCellDependencies;
  logCategories: LogCategory[];
}

export type LogCategoriesGridCellDependencies = LogCategoriesGridHistogramCellDependencies &
  LogCategoriesGridChangeTimeCellDependencies;

export const renderLogCategoriesGridCell: RenderCellValue = ({
  rowIndex,
  columnId,
  isExpanded,
  ...rest
}) => {
  const { dependencies, logCategories } = getCellContext(rest);

  const logCategory = logCategories[rowIndex];

  switch (columnId as LogCategoriesGridColumnId) {
    case 'pattern':
      return <LogCategoriesGridPatternCell logCategory={logCategory} />;
    case 'count':
      return <LogCategoriesGridCountCell logCategory={logCategory} />;
    case 'history':
      return (
        <LogCategoriesGridHistogramCell dependencies={dependencies} logCategory={logCategory} />
      );
    case 'change_type':
      return <LogCategoriesGridChangeTypeCell logCategory={logCategory} />;
    case 'change_time':
      return (
        <LogCategoriesGridChangeTimeCell dependencies={dependencies} logCategory={logCategory} />
      );
    default:
      return <>-</>;
  }
};

export const logCategoriesGridColumns = [
  logCategoriesGridPatternColumn,
  logCategoriesGridCountColumn,
  logCategoriesGridChangeTypeColumn,
  logCategoriesGridChangeTimeColumn,
  logCategoriesGridHistoryColumn,
] satisfies EuiDataGridColumn[];

export const logCategoriesGridColumnIds = logCategoriesGridColumns.map(({ id }) => id);

export type LogCategoriesGridColumnId = (typeof logCategoriesGridColumns)[number]['id'];

const cellContextKey = 'cellContext';

export const getCellContext = (cellContext: object): LogCategoriesGridCellContext =>
  (cellContextKey in cellContext
    ? cellContext[cellContextKey]
    : {}) as LogCategoriesGridCellContext;

export const createCellContext = (
  logCategories: LogCategory[],
  dependencies: LogCategoriesGridCellDependencies
): { [cellContextKey]: LogCategoriesGridCellContext } => ({
  [cellContextKey]: {
    dependencies,
    logCategories,
  },
});
