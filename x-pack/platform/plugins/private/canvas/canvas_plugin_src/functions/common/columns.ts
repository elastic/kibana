/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, pick, find } from 'lodash';
import { Datatable, DatatableColumn, ExpressionFunctionDefinition } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  include: string;
  exclude: string;
}

const prepareFields = (fields: string) => fields.split(',').map((field) => field.trim());

const getFieldsIds = (cols: DatatableColumn[]) => cols.map((col) => col.id ?? col.name);

const splitColumnsByFields = (
  cols: DatatableColumn[],
  fields: string[],
  saveOther: boolean = false
) =>
  cols.reduce<{ matched: DatatableColumn[]; other: DatatableColumn[] }>(
    (splitColumns, col) => {
      if (fields.includes(col.id) || fields.includes(col.name)) {
        return { ...splitColumns, matched: [...splitColumns.matched, col] };
      }

      return saveOther ? { ...splitColumns, other: [...splitColumns.other, col] } : splitColumns;
    },
    { matched: [], other: [] }
  );

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
        const fields = prepareFields(exclude);
        const { matched: excluded, other } = splitColumnsByFields(result.columns, fields, true);
        const fieldsIds = getFieldsIds(excluded);
        const rows = excluded.length ? result.rows.map((row) => omit(row, fieldsIds)) : result.rows;
        result = { rows, columns: other, ...rest };
      }

      if (include) {
        const fields = prepareFields(include);
        const { matched: included } = splitColumnsByFields(result.columns, fields);
        const fieldsIds = getFieldsIds(included);

        // Include columns in the order the user specified
        const cols = fields.reduce<DatatableColumn[]>((includedCols, field) => {
          const column = find(included, (col) => col.id === field || col.name === field);
          return column ? [...includedCols, column] : includedCols;
        }, []);

        const rows = cols.length ? result.rows.map((row) => pick(row, fieldsIds)) : [];
        result = { rows, columns: cols, ...rest };
      }

      return result;
    },
  };
}
