/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumnSortingConfig, EuiDataGridPaginationProps } from '@elastic/eui';
import { EuiDataGrid } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createConsoleInspector } from '@kbn/xstate-utils';
import { useMachine } from '@xstate/react';
import _ from 'lodash';
import React, { useMemo } from 'react';
import { assign, setup } from 'xstate';
import type { LogCategory } from '../../types';
import type {
  LogCategoriesGridCellDependencies,
  LogCategoriesGridColumnId,
} from './log_categories_grid_cell';
import {
  createCellContext,
  logCategoriesGridColumnIds,
  logCategoriesGridColumns,
  renderLogCategoriesGridCell,
} from './log_categories_grid_cell';
import { createLogCategoriesGridControlColumns } from './log_categories_grid_control_columns';

export interface LogCategoriesGridProps {
  dependencies: LogCategoriesGridDependencies;
  logCategories: LogCategory[];
  expandedRowIndex: number | null;
  onOpenFlyout: (category: LogCategory, rowIndex: number) => void;
  onCloseFlyout: () => void;
}

export type LogCategoriesGridDependencies = LogCategoriesGridCellDependencies;

export const LogCategoriesGrid: React.FC<LogCategoriesGridProps> = ({
  dependencies,
  logCategories,
  expandedRowIndex,
  onOpenFlyout,
  onCloseFlyout,
}) => {
  const [gridState, dispatchGridEvent] = useMachine(gridStateService, {
    input: {
      visibleColumns: logCategoriesGridColumns.map(({ id }) => id),
    },
    inspect: consoleInspector,
  });

  const sortedLogCategories = useMemo(() => {
    const sortingCriteria = gridState.context.sortingColumns.map(
      ({ id, direction }): [(logCategory: LogCategory) => any, 'asc' | 'desc'] => {
        switch (id) {
          case 'count':
            return [(logCategory: LogCategory) => logCategory.documentCount, direction];
          case 'change_type':
            // TODO: use better sorting weight for change types
            return [(logCategory: LogCategory) => logCategory.change.type, direction];
          case 'change_time':
            return [
              (logCategory: LogCategory) =>
                'timestamp' in logCategory.change ? logCategory.change.timestamp ?? '' : '',
              direction,
            ];
          default:
            return [_.identity, direction];
        }
      }
    );
    return _.orderBy(
      logCategories,
      sortingCriteria.map(([accessor]) => accessor),
      sortingCriteria.map(([, direction]) => direction)
    );
  }, [gridState.context.sortingColumns, logCategories]);

  return (
    <EuiDataGrid
      aria-label={logCategoriesGridLabel}
      columns={logCategoriesGridColumns}
      columnVisibility={{
        visibleColumns: gridState.context.visibleColumns,
        setVisibleColumns: (visibleColumns) =>
          dispatchGridEvent({ type: 'changeVisibleColumns', visibleColumns }),
      }}
      cellContext={createCellContext(sortedLogCategories, dependencies)}
      pagination={{
        ...gridState.context.pagination,
        onChangeItemsPerPage: (pageSize) => dispatchGridEvent({ type: 'changePageSize', pageSize }),
        onChangePage: (pageIndex) => dispatchGridEvent({ type: 'changePageIndex', pageIndex }),
      }}
      renderCellValue={renderLogCategoriesGridCell}
      rowCount={sortedLogCategories.length}
      sorting={{
        columns: gridState.context.sortingColumns,
        onSort: (sortingColumns) =>
          dispatchGridEvent({ type: 'changeSortingColumns', sortingColumns }),
      }}
      leadingControlColumns={createLogCategoriesGridControlColumns({
        expandedRowIndex,
        onOpenFlyout,
        onCloseFlyout,
      })}
    />
  );
};

const gridStateService = setup({
  types: {
    context: {} as {
      visibleColumns: string[];
      pagination: Pick<EuiDataGridPaginationProps, 'pageIndex' | 'pageSize' | 'pageSizeOptions'>;
      sortingColumns: LogCategoriesGridSortingConfig[];
    },
    events: {} as
      | {
          type: 'changePageSize';
          pageSize: number;
        }
      | {
          type: 'changePageIndex';
          pageIndex: number;
        }
      | {
          type: 'changeSortingColumns';
          sortingColumns: EuiDataGridColumnSortingConfig[];
        }
      | {
          type: 'changeVisibleColumns';
          visibleColumns: string[];
        },
    input: {} as {
      visibleColumns: string[];
    },
  },
}).createMachine({
  id: 'logCategoriesGridState',
  context: ({ input }) => ({
    visibleColumns: input.visibleColumns,
    pagination: { pageIndex: 0, pageSize: 20, pageSizeOptions: [10, 20, 50] },
    sortingColumns: [{ id: 'change_time', direction: 'desc' }],
  }),
  on: {
    changePageSize: {
      actions: assign(({ context, event }) => ({
        pagination: {
          ...context.pagination,
          pageIndex: 0,
          pageSize: event.pageSize,
        },
      })),
    },
    changePageIndex: {
      actions: assign(({ context, event }) => ({
        pagination: {
          ...context.pagination,
          pageIndex: event.pageIndex,
        },
      })),
    },
    changeSortingColumns: {
      actions: assign(({ event }) => ({
        sortingColumns: event.sortingColumns.filter(
          (sortingConfig): sortingConfig is LogCategoriesGridSortingConfig =>
            (logCategoriesGridColumnIds as string[]).includes(sortingConfig.id)
        ),
      })),
    },
    changeVisibleColumns: {
      actions: assign(({ event }) => ({
        visibleColumns: event.visibleColumns,
      })),
    },
  },
});

const consoleInspector = createConsoleInspector();

const logCategoriesGridLabel = i18n.translate(
  'xpack.observabilityLogsOverview.logCategoriesGrid.euiDataGrid.logCategoriesLabel',
  { defaultMessage: 'Log categories' }
);

interface TypedEuiDataGridColumnSortingConfig<ColumnId extends string>
  extends EuiDataGridColumnSortingConfig {
  id: ColumnId;
}

type LogCategoriesGridSortingConfig =
  TypedEuiDataGridColumnSortingConfig<LogCategoriesGridColumnId>;
