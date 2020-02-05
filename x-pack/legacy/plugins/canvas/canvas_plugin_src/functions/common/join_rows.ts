/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Datatable, ExpressionFunction } from '../../../types';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  column: string;
  separator: string;
  quote: string;
  distinct: boolean;
}

const escapeString = (data: string, quotechar: string): string => {
  if (quotechar === undefined || quotechar === '') {
    return data;
  } else {
    const regex = new RegExp(quotechar, 'g');
    return data.replace(/\\/g, `\\\\`).replace(regex, `\\${quotechar}`);
  }
};

export function joinRows(): ExpressionFunction<'joinRows', Datatable, Arguments, string> {
  const { help, args: argHelp } = getFunctionHelp().joinRows;
  const errors = getFunctionErrors().joinRows;
  return {
    name: 'joinRows',
    type: 'string',
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
      distinct: {
        types: ['boolean'],
        help: argHelp.distinct,
        default: true,
      },
      quote: {
        types: ['string'],
        help: argHelp.quote,
        default: `"'"`,
      },
      separator: {
        aliases: ['sep', 'delimiter'],
        types: ['string'],
        help: argHelp.separator,
        default: ',',
      },
    },
    fn: (context, { column, separator, quote, distinct }) => {
      const columnMatch = context.columns.find(col => col.name === column);

      if (!columnMatch) {
        throw errors.columnNotFound(column);
      }

      return context.rows
        .reduce((acc, row) => {
          const value = row[column];
          if (distinct && acc.includes(value)) return acc;
          return acc.concat(value);
        }, [])
        .map((x: any) => `${quote}${escapeString(x, quote)}${quote}`)
        .join(separator);
    },
  };
}
