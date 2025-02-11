/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import { ExpressionFunctionDefinition, Datatable } from '@kbn/expressions-plugin/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  by: string;
  reverse: boolean;
}

export function sort(): ExpressionFunctionDefinition<'sort', Datatable, Arguments, Datatable> {
  const { help, args: argHelp } = getFunctionHelp().sort;

  return {
    name: 'sort',
    type: 'datatable',
    inputTypes: ['datatable'],
    help,
    args: {
      by: {
        types: ['string'],
        aliases: ['_', 'column'],
        multi: false, // TODO: No reason you couldn't.
        help: argHelp.by,
      },
      reverse: {
        types: ['boolean'],
        help: argHelp.reverse,
        options: [true, false],
        default: false,
      },
    },
    fn: (input, args) => {
      const column = args.by || input.columns[0].name;

      return {
        ...input,
        rows: args.reverse ? sortBy(input.rows, column).reverse() : sortBy(input.rows, column),
      };
    },
  };
}
