/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { prepareLogTable } from '@kbn/visualizations-common';
import type { Datatable, DatatableRow, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import { TRANSPOSE_VISUAL_SEPARATOR } from '@kbn/transpose-utils';
import type { FormatFactory } from '../../../types';
import { computeSummaryRowForColumn } from './summary';
import type { DatatableExpressionFunction } from '../../defs/datatable/types';
import { transposeTable } from './transpose_helpers';
import {
  DatatableInspectorTables,
  type SubtotalConfig,
  type GrandTotalConfig,
  type DatatableArgs,
} from '../../defs/datatable/datatable';
import type { DatatableColumnResult } from './datatable_column';

/**
 * Helper to calculate aggregations for a group of rows
 */
function calculateGroupSubtotal(
  rows: DatatableRow[],
  metricColumns: DatatableColumnResult[],
  functions: Array<'sum' | 'avg' | 'count' | 'min' | 'max'>
): DatatableRow {
  const subtotalRow: DatatableRow = {};

  metricColumns.forEach((col) => {
    const values = rows.map((row) => row[col.columnId]).filter((v) => v != null && typeof v === 'number');

    if (values.length === 0) {
      // If no numeric values, leave cells empty
      return;
    }

    // For each aggregation function, calculate the value
    // We'll use the base column ID (without function suffix) since we're replacing the metric values
    functions.forEach((fn) => {
      let result: number;
      switch (fn) {
        case 'sum':
          result = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'count':
          result = values.length;
          break;
        case 'min':
          result = Math.min(...values);
          break;
        case 'max':
          result = Math.max(...values);
          break;
      }

      // For now, just use the primary function (first in the list)
      // In the future, we could create separate columns for each function
      if (fn === functions[0]) {
        subtotalRow[col.columnId] = result;
      }
    });
  });

  return subtotalRow;
}

/**
 * Group rows by bucket column values
 */
function groupRowsBy(
  rows: DatatableRow[],
  groupingColumns: DatatableColumnResult[]
): Array<{ key: string; rows: DatatableRow[]; values: Record<string, unknown> }> {
  const groups = new Map<string, DatatableRow[]>();

  rows.forEach((row) => {
    const groupKey = groupingColumns.map((col) => String(row[col.columnId] ?? '')).join('|||');
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(row);
  });

  return Array.from(groups.entries()).map(([key, groupRows]) => {
    const values: Record<string, unknown> = {};
    groupingColumns.forEach((col) => {
      values[col.columnId] = groupRows[0]?.[col.columnId];
    });
    return { key, rows: groupRows, values };
  });
}

/**
 * Calculate subtotals for row groupings - hierarchical implementation
 */
function calculateSubtotals(
  table: Datatable,
  rowSubtotalConfig: SubtotalConfig,
  metricColumns: DatatableColumnResult[],
  bucketColumns: DatatableColumnResult[]
): Datatable {
  if (!rowSubtotalConfig.enabled || rowSubtotalConfig.levels.length === 0) {
    return table;
  }

  // Sort levels in ascending order
  const sortedLevels = [...rowSubtotalConfig.levels].sort((a, b) => a - b);
  const maxLevel = Math.max(...sortedLevels);

  if (maxLevel > bucketColumns.length) {
    // Invalid configuration - just return the table as-is
    return table;
  }

  // Build a hierarchical tree of the data
  const processRowsRecursively = (
    rows: DatatableRow[],
    currentLevel: number
  ): DatatableRow[] => {
    if (currentLevel > maxLevel) {
      // Base case: just return the rows
      return rows;
    }

    const groupingColumns = bucketColumns.slice(0, currentLevel);
    const groups = groupRowsBy(rows, groupingColumns);
    const result: DatatableRow[] = [];

    groups.forEach((group) => {
      // Process children recursively
      const processedChildren = processRowsRecursively(group.rows, currentLevel + 1);

      if (rowSubtotalConfig.position === 'before' && sortedLevels.includes(currentLevel)) {
        // Add subtotal before the group
        const subtotalRow = calculateGroupSubtotal(
          group.rows,
          metricColumns,
          rowSubtotalConfig.functions
        );
        Object.assign(subtotalRow, group.values);
        (subtotalRow as any).__isSubtotal = true;
        (subtotalRow as any).__subtotalLevel = currentLevel;
        result.push(subtotalRow);
      }

      // Add processed children
      result.push(...processedChildren);

      if (rowSubtotalConfig.position === 'after' && sortedLevels.includes(currentLevel)) {
        // Add subtotal after the group
        const subtotalRow = calculateGroupSubtotal(
          group.rows,
          metricColumns,
          rowSubtotalConfig.functions
        );
        Object.assign(subtotalRow, group.values);
        (subtotalRow as any).__isSubtotal = true;
        (subtotalRow as any).__subtotalLevel = currentLevel;
        result.push(subtotalRow);
      }
    });

    return result;
  };

  const rowsWithSubtotals = processRowsRecursively(table.rows, 1);

  return {
    ...table,
    rows: rowsWithSubtotals,
  };
}

/**
 * Add grand total columns that aggregate across transposed columns
 */
function addGrandTotalColumns(
  table: Datatable,
  args: DatatableArgs,
  grandTotalConfig: GrandTotalConfig
): Datatable {
  // Identify all transposed columns (columns created by transpose operation)
  const transposedColumns = args.columns.filter((col) => col.bucketValues && col.bucketValues.length > 0);

  if (transposedColumns.length === 0) {
    // No transposed columns, nothing to do
    return table;
  }

  // Group transposed columns by their original metric column
  const columnsByOriginalMetric = new Map<string, DatatableColumnResult[]>();
  transposedColumns.forEach((col) => {
    const originalId = col.originalColumnId || col.columnId;
    if (!columnsByOriginalMetric.has(originalId)) {
      columnsByOriginalMetric.set(originalId, []);
    }
    columnsByOriginalMetric.get(originalId)!.push(col);
  });

  // Create grand total columns for each metric
  const grandTotalColumns: DatatableColumn[] = [];
  const grandTotalColumnConfigs: DatatableColumnResult[] = [];

  columnsByOriginalMetric.forEach((columns, originalMetricId) => {
    const firstColumn = columns[0];
    const originalName = firstColumn.originalName || 'Total';

    // Create a grand total column ID
    const grandTotalColumnId = `${originalMetricId}___grand_total`;

    // Find the original column definition from the table
    const originalTableColumn = table.columns.find((c) => c.id === columns[0].columnId);

    if (originalTableColumn) {
      grandTotalColumns.push({
        ...originalTableColumn,
        id: grandTotalColumnId,
        name: `Grand Total ${TRANSPOSE_VISUAL_SEPARATOR} ${originalName}`,
      });

      grandTotalColumnConfigs.push({
        ...firstColumn,
        columnId: grandTotalColumnId,
        originalColumnId: originalMetricId,
        originalName,
        isMetric: true,
        // Mark this as a grand total column
        bucketValues: undefined, // Clear bucket values to indicate this is not transposed
        isTransposed: false,
      });
    }
  });

  // Add the grand total columns to the table
  const enhancedTable = {
    ...table,
    columns: [...table.columns, ...grandTotalColumns],
    rows: table.rows.map((row) => {
      const enhancedRow = { ...row };

      // Calculate grand totals for this row
      columnsByOriginalMetric.forEach((columns, originalMetricId) => {
        const grandTotalColumnId = `${originalMetricId}___grand_total`;

        // Extract numeric values from all transposed columns
        const values = columns
          .map((col) => row[col.columnId])
          .filter((v) => v != null && typeof v === 'number') as number[];

        if (values.length === 0) {
          // No values to aggregate
          enhancedRow[grandTotalColumnId] = null;
          return;
        }

        // Calculate based on the first function in the config
        const fn = grandTotalConfig.functions[0] || 'sum';
        let result: number;

        switch (fn) {
          case 'sum':
            result = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            result = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'count':
            result = values.length;
            break;
          case 'min':
            result = Math.min(...values);
            break;
          case 'max':
            result = Math.max(...values);
            break;
          default:
            result = values.reduce((a, b) => a + b, 0);
        }

        enhancedRow[grandTotalColumnId] = result;
      });

      return enhancedRow;
    }),
  };

  // Update args.columns to include the new grand total column configs
  args.columns.push(...grandTotalColumnConfigs);

  return enhancedTable;
}

/**
 * Calculate grand totals
 */
function calculateGrandTotals(
  table: Datatable,
  args: DatatableArgs,
  grandTotalConfig: GrandTotalConfig,
  metricColumns: DatatableColumnResult[]
): Datatable {
  if (!grandTotalConfig.rows && !grandTotalConfig.columns) {
    return table;
  }

  let enhancedTable = { ...table };

  if (grandTotalConfig.rows) {
    const grandTotalRow = calculateGroupSubtotal(
      table.rows,
      metricColumns,
      grandTotalConfig.functions
    );
    (grandTotalRow as any).__isGrandTotal = true;

    // Add "Grand Total" label to the first bucket column
    const bucketColumns = table.columns.filter((col) => {
      const colConfig = args.columns.find((c) => c.columnId === col.id);
      return colConfig && !colConfig.isMetric && !colConfig.bucketValues;
    });

    if (bucketColumns.length > 0) {
      // Set the first bucket column to "Grand Total"
      grandTotalRow[bucketColumns[0].id] = 'Grand Total';
    }

    // Add grand total row based on position
    if (grandTotalConfig.position === 'top') {
      enhancedTable.rows = [grandTotalRow, ...table.rows];
    } else {
      enhancedTable.rows = [...table.rows, grandTotalRow];
    }
  }

  // Add grand total columns
  if (grandTotalConfig.columns) {
    enhancedTable = addGrandTotalColumns(enhancedTable, args, grandTotalConfig);
  }

  return enhancedTable;
}

export const datatableFn =
  (
    getFormatFactory: (context: ExecutionContext) => FormatFactory | Promise<FormatFactory>
  ): DatatableExpressionFunction['fn'] =>
  async (table, args, context) => {
    // Parse JSON string args into objects
    const parsedArgs = {
      ...args,
      rowSubtotals: typeof args.rowSubtotals === 'string' && args.rowSubtotals
        ? JSON.parse(args.rowSubtotals)
        : args.rowSubtotals,
      columnSubtotals: typeof args.columnSubtotals === 'string' && args.columnSubtotals
        ? JSON.parse(args.columnSubtotals)
        : args.columnSubtotals,
      grandTotals: typeof args.grandTotals === 'string' && args.grandTotals
        ? JSON.parse(args.grandTotals)
        : args.grandTotals,
    };

    const columnSortMap = parsedArgs.columns.reduce((acc, c, i) => acc.set(c.columnId, i), new Map());
    const getColumnSort = (id: string) => columnSortMap.get(id) ?? Infinity;
    const sortedTable: Datatable = {
      ...table,
      columns: table.columns.slice().sort((a, b) => getColumnSort(a.id) - getColumnSort(b.id)),
    };

    if (context?.inspectorAdapters?.tables) {
      context.inspectorAdapters.tables.reset();
      context.inspectorAdapters.tables.allowCsvExport = true;

      const logTable = prepareLogTable(
        sortedTable,
        [
          [
            args.columns.map((column) => column.columnId),
            i18n.translate('xpack.lens.datatable.column.help', {
              defaultMessage: 'Datatable column',
            }),
          ],
        ],
        true
      );

      context.inspectorAdapters.tables.logDatatable(DatatableInspectorTables.Default, logTable);
    }

    let untransposedData: Datatable | undefined;

    const formatters: Record<string, ReturnType<FormatFactory>> = {};
    const formatFactory = await getFormatFactory(context);

    sortedTable.columns.forEach((column) => {
      formatters[column.id] = formatFactory(column.meta?.params);
    });

    const hasTransposedColumns = args.columns.some((c) => c.isTransposed);
    if (hasTransposedColumns) {
      // store original shape of data separately
      untransposedData = cloneDeep(sortedTable);
      // transposes table and args in-place
      transposeTable(args, sortedTable, formatters, args.maxTransposeColumns);

      if (context?.inspectorAdapters?.tables) {
        const logTransposedTable = prepareLogTable(
          sortedTable,
          [
            [
              args.columns.map((column) => column.columnId),
              i18n.translate('xpack.lens.datatable.column.help', {
                defaultMessage: 'Datatable column',
              }),
            ],
          ],
          true
        );

        context.inspectorAdapters.tables.logDatatable(
          DatatableInspectorTables.Transpose,
          logTransposedTable
        );
        context.inspectorAdapters.tables.initialSelectedTable = DatatableInspectorTables.Transpose;
      }
    }

    // Calculate subtotals if configured
    if (parsedArgs.rowSubtotals?.enabled) {
      // Use `args` not `parsedArgs` because transposeTable may have replaced args.columns
      const bucketColumns = args.columns.filter((c) => !c.isMetric && !c.isTransposed);
      const metricColumns = args.columns.filter((c) => c.isMetric);
      sortedTable.rows = calculateSubtotals(
        sortedTable,
        parsedArgs.rowSubtotals,
        metricColumns,
        bucketColumns
      ).rows;
    }

    // Calculate grand totals if configured
    if (parsedArgs.grandTotals) {
      // After transpose, we need to use the ACTUAL table columns, not the pre-transpose configs
      // Create column configs from the actual table columns for numeric columns only
      const actualMetricColumns = sortedTable.columns
        .filter((tableCol) => {
          // Check if this column has numeric data by sampling first row
          if (sortedTable.rows.length === 0) return false;
          const sampleValue = sortedTable.rows[0][tableCol.id];
          return typeof sampleValue === 'number';
        })
        .map((tableCol) => ({
          type: 'lens_datatable_column' as const,
          columnId: tableCol.id,
          isMetric: true,
        }));

      // IMPORTANT: Use `args` not `parsedArgs` because transposeTable replaces args.columns with a new array
      const grandTotalResult = calculateGrandTotals(sortedTable, args, parsedArgs.grandTotals, actualMetricColumns);
      sortedTable.rows = grandTotalResult.rows;
      sortedTable.columns = grandTotalResult.columns;
    }

    const columnsWithSummary = args.columns.filter((c) => c.summaryRow);
    for (const column of columnsWithSummary) {
      column.summaryRowValue = computeSummaryRowForColumn(
        column,
        sortedTable,
        formatters,
        formatFactory({ id: 'number' })
      );
    }

    return {
      type: 'render',
      as: 'lens_datatable_renderer',
      value: {
        data: sortedTable,
        untransposedData,
        syncColors: context.isSyncColorsEnabled?.() ?? false,
        args: {
          ...args,
          title: (context.variables.embeddableTitle as string) ?? args.title,
        },
      },
    };
  };
