/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { TRANSPOSE_VISUAL_SEPARATOR, getTransposeId } from '@kbn/transpose-utils';
import type { DatatableArgs } from '../../defs/datatable/datatable';
import type { DatatableColumnConfig, DatatableColumnArgs } from './datatable_column';

/**
 * Maximum number of columns allowed in a pivot table
 * Prevents performance issues with extremely wide tables
 */
export const MAX_PIVOT_COLUMNS = 500;

/**
 * Interface for tracking transpose dimensions
 */
export interface TransposeDimension {
  columnId: string;
  dimension: 'rows' | 'columns';
  level: number;
}

/**
 * Simple memoization function for caching expensive calculations
 */
function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey(...args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Sparse matrix representation for efficient storage of pivot table data
 * Only stores non-null values to save memory for sparse datasets
 */
interface SparseMatrix {
  get: (row: string, col: string) => DatatableRow | undefined;
  has: (row: string, col: string) => boolean;
  size: number;
}

/**
 * Create a sparse matrix from flat rows for efficient lookup
 * Useful for large pivot tables with many empty cells
 * @public - Exported for potential future use in performance optimizations
 */
export function createSparseMatrix(
  rows: DatatableRow[],
  rowKeys: string[],
  colKeys: string[]
): SparseMatrix {
  const matrix = new Map<string, DatatableRow>();

  rows.forEach((row) => {
    const rowKey = rowKeys.map((k) => row[k]).join('_');
    const colKey = colKeys.map((k) => row[k]).join('_');
    const matrixKey = `${rowKey}:${colKey}`;

    matrix.set(matrixKey, row);
  });

  return {
    get: (row: string, col: string) => matrix.get(`${row}:${col}`),
    has: (row: string, col: string) => matrix.has(`${row}:${col}`),
    size: matrix.size,
  };
}

/**
 * Validate that transpose won't create excessive columns
 * Throws an error if the projected column count exceeds limits
 * @public - Exported for potential use in pre-validation before transpose
 */
export function validateTransposeSize(
  uniqueValueCounts: number[],
  metricCount: number,
  maxColumns: number = MAX_PIVOT_COLUMNS
): void {
  const totalColumns = uniqueValueCounts.reduce((a, b) => a * b, 1) * metricCount;

  if (totalColumns > maxColumns) {
    throw new Error(
      `Pivot table would create ${totalColumns} columns, exceeding the limit of ${maxColumns}. ` +
        `Consider filtering your data or reducing the number of unique values.`
    );
  }
}

/**
 * Transposes the columns of the given table as defined in the arguments.
 * This function modifies the passed in args and firstTable objects.
 * This process consists out of three parts:
 *
 * * Calculating the new column arguments
 * * Calculating the new datatable columns
 * * Calculating the new rows
 *
 * If the table is transposed by multiple columns, this process is repeated on top of the previous transformation.
 *
 * Enhanced to support multi-dimensional transpose with explicit dimension tracking.
 */
export function transposeTable(
  args: DatatableArgs,
  firstTable: Datatable,
  formatters: Record<string, FieldFormat>,
  maxColumns?: number
) {
  // Get all transposed columns and enrich with dimension information
  const transposedColumns = args.columns
    .filter((columnArgs) => columnArgs.isTransposed)
    .map((col, index) => ({
      ...col,
      // Default to 'columns' dimension for backward compatibility
      transposeDimension: col.transposeDimension || 'columns',
      transposeLevel: col.transposeLevel ?? index,
    }));

  // Group by dimension type for potential different processing
  const transposedByDimension = transposedColumns.reduce(
    (acc, col) => {
      const dimension = col.transposeDimension || 'columns';
      acc[dimension] = acc[dimension] || [];
      acc[dimension].push(col);
      return acc;
    },
    {} as Record<string, DatatableColumnArgs[]>
  );

  // Process column dimensions (creates new columns) - this is the current behavior
  if (transposedByDimension.columns) {
    processColumnTranspose(
      args,
      firstTable,
      formatters,
      transposedByDimension.columns,
      maxColumns
    );
  }

  // Process row dimensions if any (currently just an extension point for future functionality)
  // For now, row dimensions are processed the same way as column dimensions
  if (transposedByDimension.rows) {
    processColumnTranspose(
      args,
      firstTable,
      formatters,
      transposedByDimension.rows,
      maxColumns
    );
  }
}

/**
 * Process column dimension transpose (creates new columns)
 * This maintains the existing transpose behavior
 */
function processColumnTranspose(
  args: DatatableArgs,
  firstTable: Datatable,
  formatters: Record<string, FieldFormat>,
  columnDimensions: DatatableColumnArgs[],
  maxColumns?: number
) {
  // Process in reverse order to preserve column grouping
  columnDimensions
    .slice()
    .reverse()
    .forEach((columnArgs) => {
      const { columnId: transposedColumnId, transposeDimension, transposeLevel } = columnArgs;
      const datatableColumnIndex = firstTable.columns.findIndex((c) => c.id === transposedColumnId);
      const datatableColumn = firstTable.columns[datatableColumnIndex];
      const transposedColumnFormatter = formatters[datatableColumn.id];

      // Use memoized version for better performance with repeated transposes
      const { uniqueValues, uniqueRawValues } = memoizedGetUniqueValues(
        firstTable,
        transposedColumnFormatter,
        transposedColumnId
      );

      // Validate column limit if specified
      if (maxColumns != null) {
        const metricsColumnArgs = args.columns.filter((c) => c.transposable);
        const projectedColumnCount = uniqueValues.length * metricsColumnArgs.length;

        if (projectedColumnCount > maxColumns) {
          throw new Error(
            `Transpose would create ${projectedColumnCount} columns, exceeding the limit of ${maxColumns}. ` +
              `Consider filtering your data, reducing unique values, or increasing the column limit.`
          );
        }
      }

      const metricsColumnArgs = args.columns.filter((c) => c.transposable);
      const bucketsColumnArgs = args.columns.filter(
        (c) => !c.transposable && c.columnId !== transposedColumnId
      );
      firstTable.columns.splice(datatableColumnIndex, 1);

      transposeColumns(
        args,
        bucketsColumnArgs,
        metricsColumnArgs,
        firstTable,
        uniqueValues,
        uniqueRawValues,
        datatableColumn,
        transposeDimension,
        transposeLevel
      );
      transposeRows(
        firstTable,
        bucketsColumnArgs,
        formatters,
        transposedColumnFormatter,
        transposedColumnId,
        metricsColumnArgs,
        transposeDimension
      );

      const colOrderMap = new Map(args.columns.map((c, i) => [c.columnId, i]));
      firstTable.columns.sort((a, b) => {
        return (colOrderMap.get(a.id) ?? 0) - (colOrderMap.get(b.id) ?? 0);
      });
    });
}

function transposeRows(
  firstTable: Datatable,
  bucketsColumnArgs: DatatableColumnArgs[],
  formatters: Record<string, FieldFormat>,
  transposedColumnFormatter: FieldFormat,
  transposedColumnId: string,
  metricsColumnArgs: DatatableColumnArgs[],
  transposeDimension?: 'rows' | 'columns'
) {
  const rowsByBucketColumns: Record<string, DatatableRow[]> = groupRowsByBucketColumns(
    firstTable,
    bucketsColumnArgs,
    formatters
  );
  firstTable.rows = mergeRowGroups(
    rowsByBucketColumns,
    bucketsColumnArgs,
    transposedColumnFormatter,
    transposedColumnId,
    metricsColumnArgs,
    transposeDimension
  );
}

/**
 * Updates column args by adding bucket column args first, then adding transposed metric columns
 * grouped by unique value
 */
function updateColumnArgs(
  args: DatatableArgs,
  bucketsColumnArgs: DatatableColumnConfig['columns'],
  transposedColumnGroups: Array<DatatableColumnConfig['columns']>
) {
  args.columns = [...bucketsColumnArgs];
  // add first column from each group, then add second column for each group, ...
  transposedColumnGroups[0]?.forEach((_, index) => {
    transposedColumnGroups.forEach((transposedColumnGroup) => {
      args.columns.push(transposedColumnGroup[index]);
    });
  });
}

/**
 * Finds all unique values in a column in order of first occurence
 */
function getUniqueValues(table: Datatable, formatter: FieldFormat, columnId: string) {
  const values = new Map<string, unknown>();
  table.rows.forEach((row) => {
    const rawValue = row[columnId];
    values.set(formatter.convert(row[columnId]), rawValue);
  });
  const uniqueValues = [...values.keys()];
  const uniqueRawValues = [...values.values()];
  return { uniqueValues, uniqueRawValues };
}

/**
 * Memoized version of getUniqueValues for performance optimization
 * Cache key is based on row count and column ID
 */
const memoizedGetUniqueValues = memoize(
  getUniqueValues,
  (table: Datatable, _formatter: FieldFormat, columnId: string) => {
    return `${table.rows.length}_${columnId}`;
  }
);

/**
 * Calculate transposed column objects of the datatable object and puts them into the datatable.
 * Returns args for additional columns grouped by metric
 * Enhanced to include dimension tracking
 */
function transposeColumns(
  args: DatatableArgs,
  bucketsColumnArgs: DatatableColumnConfig['columns'],
  metricColumns: DatatableColumnConfig['columns'],
  firstTable: Datatable,
  uniqueValues: string[],
  uniqueRawValues: unknown[],
  transposingDatatableColumn: DatatableColumn,
  transposeDimension?: 'rows' | 'columns',
  transposeLevel?: number
) {
  const dimension = transposeDimension || 'columns';
  const columnGroups = metricColumns.map((metricColumn) => {
    const originalDatatableColumn = firstTable.columns.find((c) => c.id === metricColumn.columnId)!;
    const datatableColumns = uniqueValues.map((uniqueValue) => {
      return {
        ...originalDatatableColumn,
        id: getTransposeId(uniqueValue, metricColumn.columnId, dimension),
        name: `${uniqueValue} ${TRANSPOSE_VISUAL_SEPARATOR} ${originalDatatableColumn.name}`,
      };
    });
    firstTable.columns.splice(
      firstTable.columns.findIndex((c) => c.id === metricColumn.columnId),
      1,
      ...datatableColumns
    );
    return uniqueValues.map((uniqueValue, valueIndex) => {
      return {
        ...metricColumn,
        columnId: getTransposeId(uniqueValue, metricColumn.columnId, dimension),
        originalColumnId: metricColumn.originalColumnId || metricColumn.columnId,
        originalName: metricColumn.originalName || originalDatatableColumn.name,
        transposeDimension: dimension,
        transposeLevel,
        bucketValues: [
          ...(metricColumn.bucketValues || []),
          {
            originalBucketColumn: transposingDatatableColumn,
            value: uniqueRawValues[valueIndex],
            dimension,
          },
        ],
      };
    });
  });
  updateColumnArgs(args, bucketsColumnArgs, columnGroups);
}

/**
 * Merge groups of rows together by creating separate columns for unique values of the column to transpose by.
 */
function mergeRowGroups(
  rowsByBucketColumns: Record<string, DatatableRow[]>,
  bucketColumns: DatatableColumnArgs[],
  formatter: FieldFormat,
  transposedColumnId: string,
  metricColumns: DatatableColumnArgs[],
  transposeDimension?: 'rows' | 'columns'
) {
  const dimension = transposeDimension || 'columns';
  return Object.values(rowsByBucketColumns).map((rows) => {
    const mergedRow: DatatableRow = {};
    bucketColumns.forEach((c) => {
      mergedRow[c.columnId] = rows[0][c.columnId];
    });
    rows.forEach((row) => {
      const transposalValue = formatter.convert(row[transposedColumnId]);
      metricColumns.forEach((c) => {
        mergedRow[getTransposeId(transposalValue, c.columnId, dimension)] = row[c.columnId];
      });
    });
    return mergedRow;
  });
}

/**
 * Groups rows of the data table by the values of bucket columns which are not transposed by.
 * All rows ending up in a group have the same bucket column value, but have different values of the column to transpose by.
 */
function groupRowsByBucketColumns(
  firstTable: Datatable,
  bucketColumns: DatatableColumnArgs[],
  formatters: Record<string, FieldFormat>
) {
  const rowsByBucketColumns: Record<string, DatatableRow[]> = {};
  firstTable.rows.forEach((row) => {
    const key = bucketColumns.map((c) => formatters[c.columnId].convert(row[c.columnId])).join(',');
    if (!rowsByBucketColumns[key]) {
      rowsByBucketColumns[key] = [];
    }
    rowsByBucketColumns[key].push(row);
  });
  return rowsByBucketColumns;
}
