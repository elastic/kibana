/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit, pick, find } from 'lodash';
import { Datatable, DatatableColumn, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  include: string;
  exclude: string;
}

export function columns(): ExpressionFunctionDefinition<
  'columns',
  Datatable,
  Arguments,
  Datatable
> {
  const { help, args: argHelp } = getFunctionHelp().columns;

  return {
    name: 'columns',
    type: 'datatable',
    inputTypes: ['datatable'],
    help,
    args: {
      include: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.include,
      },
      exclude: {
        types: ['string'],
        help: argHelp.exclude,
      },
    },
    fn: (input, args) => {
      const { include, exclude } = args;
      const { columns: contextColumns, rows: contextRows, ...rest } = input;
      let result = { ...input };

      if (exclude) {
        const fields = exclude.split(',').map(field => field.trim());
        const cols = contextColumns.filter(col => !fields.includes(col.name));
        const rows = cols.length > 0 ? contextRows.map(row => omit(row, fields)) : [];

        result = { rows, columns: cols, ...rest };
      }

      if (include) {
        const fields = include.split(',').map(field => field.trim());
        // const columns = result.columns.filter(col => fields.includes(col.name));

        // Include columns in the order the user specified
        const cols: DatatableColumn[] = [];

        fields.forEach(field => {
          const column = find(result.columns, { name: field });
          if (column) {
            cols.push(column);
          }
        });
        const rows = cols.length > 0 ? result.rows.map(row => pick(row, fields)) : [];
        result = { rows, columns: cols, ...rest };
      }

      return result;
    },
  };
}
