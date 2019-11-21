/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter, ExpressionFunction } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  column: string;
  value: string;
  filterGroup: string;
}

export function exactly(): ExpressionFunction<'exactly', Filter, Arguments, Filter> {
  const { help, args: argHelp } = getFunctionHelp().exactly;

  return {
    name: 'exactly',
    aliases: [],
    type: 'filter',
    help,
    context: {
      types: ['filter'],
    },
    args: {
      column: {
        types: ['string'],
        aliases: ['field', 'c'],
        required: true,
        help: argHelp.column,
      },
      value: {
        types: ['string'],
        aliases: ['v', 'val'],
        required: true,
        help: argHelp.value,
      },
      filterGroup: {
        types: ['string'],
        help: argHelp.filterGroup,
      },
    },
    fn: (context, args) => {
      const { value, column } = args;

      const filter = {
        type: 'exactly',
        value,
        column,
        and: [],
      };

      return { ...context, and: [...context.and, filter] };
    },
  };
}
