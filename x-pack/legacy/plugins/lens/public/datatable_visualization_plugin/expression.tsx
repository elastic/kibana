/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable } from '@elastic/eui';
import {
  ExpressionFunction,
  KibanaDatatable,
} from '../../../../../../src/plugins/expressions/common';
import { LensMultiTable } from '../types';
import {
  IInterpreterRenderFunction,
  IInterpreterRenderHandlers,
} from '../../../../../../src/plugins/expressions/public';
import { FormatFactory } from '../../../../../../src/legacy/ui/public/visualize/loader/pipeline_helpers/utilities';
import { VisualizationContainer } from '../visualization_container';

export interface DatatableColumns {
  columnIds: string[];
}

interface Args {
  columns: DatatableColumns;
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

export const datatable: ExpressionFunction<
  'lens_datatable',
  KibanaDatatable,
  Args,
  DatatableRender
> = ({
  name: 'lens_datatable',
  type: 'render',
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
  context: {
    types: ['lens_multitable'],
  },
  fn(data: KibanaDatatable, args: Args) {
    return {
      type: 'render',
      as: 'lens_datatable_renderer',
      value: {
        data,
        args,
      },
    };
  },
  // TODO the typings currently don't support custom type args. As soon as they do, this can be removed
} as unknown) as ExpressionFunction<'lens_datatable', KibanaDatatable, Args, DatatableRender>;

type DatatableColumnsResult = DatatableColumns & { type: 'lens_datatable_columns' };

export const datatableColumns: ExpressionFunction<
  'lens_datatable_columns',
  null,
  DatatableColumns,
  DatatableColumnsResult
> = {
  name: 'lens_datatable_columns',
  aliases: [],
  type: 'lens_datatable_columns',
  help: '',
  context: {
    types: ['null'],
  },
  args: {
    columnIds: {
      types: ['string'],
      multi: true,
      help: '',
    },
  },
  fn: function fn(_context: unknown, args: DatatableColumns) {
    return {
      type: 'lens_datatable_columns',
      ...args,
    };
  },
};

export const getDatatableRenderer = (
  formatFactory: FormatFactory
): IInterpreterRenderFunction<DatatableProps> => ({
  name: 'lens_datatable_renderer',
  displayName: i18n.translate('xpack.lens.datatable.visualizationName', {
    defaultMessage: 'Datatable',
  }),
  help: '',
  validate: () => {},
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: DatatableProps,
    handlers: IInterpreterRenderHandlers
  ) => {
    ReactDOM.render(
      <DatatableComponent {...config} formatFactory={formatFactory} />,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

function DatatableComponent(props: DatatableProps & { formatFactory: FormatFactory }) {
  const [firstTable] = Object.values(props.data.tables);
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  firstTable.columns.forEach(column => {
    formatters[column.id] = props.formatFactory(column.formatHint);
  });

  return (
    <VisualizationContainer>
      <EuiBasicTable
        className="lnsDataTable"
        data-test-subj="lnsDataTable"
        columns={props.args.columns.columnIds
          .map(field => {
            const col = firstTable.columns.find(c => c.id === field);
            return {
              field,
              name: (col && col.name) || '',
            };
          })
          .filter(({ field }) => !!field)}
        items={
          firstTable
            ? firstTable.rows.map(row => {
                const formattedRow: Record<string, unknown> = {};
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
