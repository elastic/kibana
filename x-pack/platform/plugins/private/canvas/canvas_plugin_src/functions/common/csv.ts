/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Papa from 'papaparse';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { Datatable } from '../../../types';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  data: string;
  delimiter: string;
  newline: string;
}

export function csv(): ExpressionFunctionDefinition<'csv', null, Arguments, Datatable> {
  const { help, args: argHelp } = getFunctionHelp().csv;
  const errorMessages = getFunctionErrors().csv;

  return {
    name: 'csv',
    type: 'datatable',
    inputTypes: ['null'],
    help,
    args: {
      data: {
        aliases: ['_'],
        types: ['string'],
        required: true,
        help: argHelp.data,
      },
      delimiter: {
        types: ['string'],
        help: argHelp.delimiter,
      },
      newline: {
        types: ['string'],
        help: argHelp.newline,
      },
    },
    fn(input, args) {
      const { data: csvString, delimiter, newline } = args;

      const config: Papa.ParseConfig = {
        transform: (val: string) => {
          if (val.indexOf('"') >= 0) {
            return val.trim().replace(/(^\"|\"$)/g, '');
          }
          return val;
        },
      };

      if (delimiter != null) {
        config.delimiter = delimiter;
      }
      if (newline != null) {
        config.newline = newline;
      }

      const output = Papa.parse(csvString, config);
      const { data, errors } = output;

      if (errors.length > 0) {
        throw errorMessages.invalidInputCSV();
      }

      // output.data is an array of arrays, rows and values in each row
      return data.reduce(
        (acc, row, i) => {
          if (i === 0) {
            // first row, assume header values
            row.forEach((colName: string) =>
              acc.columns.push({
                id: colName.trim(),
                name: colName.trim(),
                meta: { type: 'string' },
              })
            );
          } else {
            // any other row is a data row
            const rowObj = row.reduce((rowAcc: string[], colValue: string, j: number) => {
              const colName = acc.columns[j].name;
              rowAcc[colName] = colValue;
              return rowAcc;
            }, {});

            acc.rows.push(rowObj);
          }

          return acc;
        },
        {
          type: 'datatable',
          columns: [],
          rows: [],
        }
      );
    },
  };
}
