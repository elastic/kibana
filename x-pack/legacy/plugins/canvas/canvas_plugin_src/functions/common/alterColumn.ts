/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { Datatable } from 'src/plugins/expressions/common';
import { DatatableColumn, DatatableColumnType, ExpressionFunction } from '../../../types';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  column: string;
  type: DatatableColumnType | null;
  name: string;
}

export function alterColumn(): ExpressionFunction<'alterColumn', Datatable, Arguments, Datatable> {
  const { help, args: argHelp } = getFunctionHelp().alterColumn;
  const errors = getFunctionErrors().alterColumn;

  return {
    name: 'alterColumn',
    type: 'datatable',
    help,
    context: {
      types: ['datatable'],
    },
    args: {
      column: {
        aliases: ['_'],
        types: ['string'],
        required: true,
        help: argHelp.column,
      },
      name: {
        types: ['string'],
        help: argHelp.name,
      },
      type: {
        types: ['string'],
        help: argHelp.type,
        options: ['null', 'boolean', 'number', 'string', 'date'],
      },
    },
    fn: (context, args) => {
      if (!args.column || (!args.type && !args.name)) {
        return context;
      }

      const column = context.columns.find(col => col.name === args.column);
      if (!column) {
        throw errors.columnNotFound(args.column);
      }

      const name = args.name || column.name;
      const type = args.type || column.type;

      const columns = context.columns.reduce((all: DatatableColumn[], col) => {
        if (col.name !== args.name) {
          if (col.name !== column.name) {
            all.push(col);
          } else {
            all.push({ name, type });
          }
        }
        return all;
      }, []);

      let handler = (val: any) => val;

      if (args.type) {
        handler = (function getHandler() {
          switch (type) {
            case 'string':
              if (column.type === 'date') {
                return (v: string) => new Date(v).toISOString();
              }
              return String;
            case 'number':
              return Number;
            case 'date':
              return (v: Date) => new Date(v).valueOf();
            case 'boolean':
              return Boolean;
            case 'null':
              return () => null;
            default:
              throw errors.cannotConvertType(type);
          }
        })();
      }

      const rows = context.rows.map(row => ({
        ...omit(row, column.name),
        [name]: handler(row[column.name]),
      }));

      return {
        type: 'datatable',
        columns,
        rows,
      };
    },
  };
}
