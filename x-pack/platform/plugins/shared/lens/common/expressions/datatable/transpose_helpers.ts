/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { TRANSPOSE_VISUAL_SEPARATOR, getTransposeId } from '@kbn/transpose-utils';
import { DatatableArgs } from './datatable';
import type { DatatableColumnConfig, DatatableColumnArgs } from './datatable_column';

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
 */
export function transposeTable(
  args: DatatableArgs,
  firstTable: Datatable,
  formatters: Record<string, FieldFormat>
) {
  args.columns
    .filter((columnArgs) => columnArgs.isTransposed)
    .reverse() // start with the inner nested transposed column and work up to preserve column grouping
    .forEach(({ columnId: transposedColumnId }) => {
      const datatableColumnIndex = firstTable.columns.findIndex((c) => c.id === transposedColumnId);
      const datatableColumn = firstTable.columns[datatableColumnIndex];
      const transposedColumnFormatter = formatters[datatableColumn.id];
      const { uniqueValues, uniqueRawValues } = getUniqueValues(
        firstTable,
        transposedColumnFormatter,
        transposedColumnId
      );
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
        datatableColumn
      );
      transposeRows(
        firstTable,
        bucketsColumnArgs,
        formatters,
        transposedColumnFormatter,
        transposedColumnId,
        metricsColumnArgs
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
  metricsColumnArgs: DatatableColumnArgs[]
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
    metricsColumnArgs
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
 * Calculate transposed column objects of the datatable object and puts them into the datatable.
 * Returns args for additional columns grouped by metric
 */
function transposeColumns(
  args: DatatableArgs,
  bucketsColumnArgs: DatatableColumnConfig['columns'],
  metricColumns: DatatableColumnConfig['columns'],
  firstTable: Datatable,
  uniqueValues: string[],
  uniqueRawValues: unknown[],
  transposingDatatableColumn: DatatableColumn
) {
  const columnGroups = metricColumns.map((metricColumn) => {
    const originalDatatableColumn = firstTable.columns.find((c) => c.id === metricColumn.columnId)!;
    const datatableColumns = uniqueValues.map((uniqueValue) => {
      return {
        ...originalDatatableColumn,
        id: getTransposeId(uniqueValue, metricColumn.columnId),
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
        columnId: getTransposeId(uniqueValue, metricColumn.columnId),
        originalColumnId: metricColumn.originalColumnId || metricColumn.columnId,
        originalName: metricColumn.originalName || originalDatatableColumn.name,
        bucketValues: [
          ...(metricColumn.bucketValues || []),
          {
            originalBucketColumn: transposingDatatableColumn,
            value: uniqueRawValues[valueIndex],
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
  metricColumns: DatatableColumnArgs[]
) {
  return Object.values(rowsByBucketColumns).map((rows) => {
    const mergedRow: DatatableRow = {};
    bucketColumns.forEach((c) => {
      mergedRow[c.columnId] = rows[0][c.columnId];
    });
    rows.forEach((row) => {
      const transposalValue = formatter.convert(row[transposedColumnId]);
      metricColumns.forEach((c) => {
        mergedRow[getTransposeId(transposalValue, c.columnId)] = row[c.columnId];
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
