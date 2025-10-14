/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { prepareLogTable } from '@kbn/visualizations-plugin/common/utils';
import type { Datatable, ExecutionContext } from '@kbn/expressions-plugin/common';
import type { FormatFactory } from '../../../types';
import { computeSummaryRowForColumn } from './summary';
import type { DatatableExpressionFunction } from '../../defs/datatable/types';
import { transposeTable } from './transpose_helpers';
import { DatatableInspectorTables } from '../../defs/datatable/datatable';

export const datatableFn =
  (
    getFormatFactory: (context: ExecutionContext) => FormatFactory | Promise<FormatFactory>
  ): DatatableExpressionFunction['fn'] =>
  async (table, args, context) => {
    const columnSortMap = args.columns.reduce((acc, c, i) => acc.set(c.columnId, i), new Map());
    const getColumnSort = (id: string) => columnSortMap.get(id) ?? -1;
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
      transposeTable(args, sortedTable, formatters);

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
