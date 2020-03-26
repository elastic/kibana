/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { uniq, partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable } from '@elastic/eui';
import {
  ExpressionFunctionDefinition,
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
  KibanaDatatable,
  KibanaDatatableColumn,
  KibanaDatatableRow,
} from 'src/plugins/expressions/public';
import { FormatFactory, LensMultiTable } from '../types';
import { VisualizationContainer } from '../visualization_container';

export interface DatatableColumns {
  columnIds: string[];
}

interface Args {
  title: string;
  columns: DatatableColumns & { type: 'lens_datatable_columns' };
}

export interface DatatableProps {
  data: LensMultiTable;
  args: Args;
}

export interface DatatableRender {
  type: 'render';
  as: 'lens_datatable_renderer';
  value: DatatableProps;
}

export const datatable: ExpressionFunctionDefinition<
  'lens_datatable',
  LensMultiTable,
  Args,
  DatatableRender
> = {
  name: 'lens_datatable',
  type: 'render',
  inputTypes: ['lens_multitable'],
  help: i18n.translate('xpack.lens.datatable.expressionHelpLabel', {
    defaultMessage: 'Datatable renderer',
  }),
  args: {
    title: {
      types: ['string'],
      help: i18n.translate('xpack.lens.datatable.titleLabel', {
        defaultMessage: 'Title',
      }),
    },
    columns: {
      types: ['lens_datatable_columns'],
      help: '',
    },
  },
  fn(data, args) {
    return {
      type: 'render',
      as: 'lens_datatable_renderer',
      value: {
        data,
        args,
      },
    };
  },
};

type DatatableColumnsResult = DatatableColumns & { type: 'lens_datatable_columns' };

export const datatableColumns: ExpressionFunctionDefinition<
  'lens_datatable_columns',
  null,
  DatatableColumns,
  DatatableColumnsResult
> = {
  name: 'lens_datatable_columns',
  aliases: [],
  type: 'lens_datatable_columns',
  help: '',
  inputTypes: ['null'],
  args: {
    columnIds: {
      types: ['string'],
      multi: true,
      help: '',
    },
  },
  fn: function fn(input: unknown, args: DatatableColumns) {
    return {
      type: 'lens_datatable_columns',
      ...args,
    };
  },
};

export const getDatatableRenderer = (
  formatFactory: Promise<FormatFactory>
): ExpressionRenderDefinition<DatatableProps> => ({
  name: 'lens_datatable_renderer',
  displayName: i18n.translate('xpack.lens.datatable.visualizationName', {
    defaultMessage: 'Datatable',
  }),
  help: '',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: DatatableProps,
    handlers: IInterpreterRenderHandlers
  ) => {
    const resolvedFormatFactory = await formatFactory;
    ReactDOM.render(
      <DatatableComponent {...config} formatFactory={resolvedFormatFactory} />,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

function DatatableComponent(props: DatatableProps & { formatFactory: FormatFactory }) {
  let [firstTable] = Object.values(props.data.tables);
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  firstTable.columns.forEach(column => {
    formatters[column.id] = props.formatFactory(column.formatHint);
  });

  let columnIds = props.args.columns.columnIds;
  if (columnIds.length > 2) {
    firstTable = pivot(firstTable, [columnIds[0], columnIds[1]]);
    columnIds = firstTable.columns.map(({ id }) => id);
    debugger;
  }

  const columns = columnIds
    .map(field => {
      const col = firstTable.columns.find(c => c.id === field);
      return {
        field,
        name: (col && col.name) || '',
      };
    })
    .filter(({ field }) => !!field);

  return (
    <VisualizationContainer>
      <EuiBasicTable
        className="lnsDataTable"
        data-test-subj="lnsDataTable"
        columns={columns}
        items={
          firstTable
            ? firstTable.rows.map(row => {
                const formattedRow: Record<string, unknown> = { ...row };
                Object.entries(formatters).forEach(([columnId, formatter]) => {
                  formattedRow[columnId] = formatter.convert(row[columnId]);
                });
                return formattedRow;
              })
            : []
        }
      />
    </VisualizationContainer>
  );
}

function pivot(table: KibanaDatatable, bucketIds: string[]) {
  const [buckets, metrics] = partition(table.columns, col => bucketIds.includes(col.id));
  const firstColumn: KibanaDatatableColumn = buckets[0];
  const skippedColumns = buckets.slice(1);
  const uniqKeys: string[] = uniq(table.rows.map(row => row[firstColumn.id]));

  const newColumns = skippedColumns.concat(
    uniqKeys.flatMap(key => {
      const display = metrics.length > 1 ? `${key} ${name}` : key;
      return metrics.map(({ id, name, formatHint }) => ({
        id: `${key}:${id}`,
        name: display,
        formatHint,
      }));
    })
  );

  const skippedMap = new Map();

  table.rows.forEach(row => {
    const pivotKey = row[firstColumn.id];
    const newRow: KibanaDatatableRow = {};

    metrics.forEach(metricCol => {
      const metricValue = row[metricCol.id];
      const pivotKeyValue = `${pivotKey}:${metricCol.id}`;
      newRow[pivotKeyValue] = metricValue;
    });

    const skippedKeys = skippedColumns.map(({ id }) => ({
      [id]: row[id],
    }));
    const skippedKeysCombined = Object.assign({}, ...skippedKeys);

    const skippedKeysMapKey = skippedKeys.flatMap(o => Object.values(o)).join('_');
    if (!skippedMap.has(skippedKeysMapKey)) {
      skippedMap.set(skippedKeysMapKey, {
        ...skippedKeysCombined,
        ...newRow,
      });
    } else {
      const prev = skippedMap.get(skippedKeysMapKey);

      skippedMap.set(skippedKeysMapKey, {
        ...prev,
        ...newRow,
      });
    }
  });

  const newRows = Array.from(skippedMap.values());

  table.columns = newColumns;
  table.rows = newRows;

  return table;
}
