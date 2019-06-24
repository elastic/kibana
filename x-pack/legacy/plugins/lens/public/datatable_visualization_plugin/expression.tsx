/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable } from '@elastic/eui';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { KibanaDatatable } from '../types';
import { RenderFunction } from '../interpreter_types';

export interface DatatableColumns {
  columnIds: string[];
  labels: string[];
}

interface Args {
  columns: DatatableColumns;
}

export interface DatatableProps {
  data: KibanaDatatable;
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
    types: ['kibana_datatable'],
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
    labels: {
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

export interface DatatableProps {
  data: KibanaDatatable;
  args: Args;
}

export const datatableRenderer: RenderFunction<DatatableProps> = {
  name: 'lens_datatable_renderer',
  displayName: i18n.translate('xpack.lens.datatable.visualizationName', {
    defaultMessage: 'Datatable',
  }),
  help: '',
  validate: () => {},
  reuseDomNode: true,
  render: async (domNode: Element, config: DatatableProps, _handlers: unknown) => {
    ReactDOM.render(<DatatableComponent {...config} />, domNode);
  },
};

function DatatableComponent(props: DatatableProps) {
  return (
    <EuiBasicTable
      columns={props.args.columns.columnIds
        .map((id, index) => {
          return {
            field: props.args.columns.columnIds[index],
            name: props.args.columns.labels[index],
          };
        })
        .filter(({ field }) => !!field)}
      items={props.data.rows}
    />
  );
}
