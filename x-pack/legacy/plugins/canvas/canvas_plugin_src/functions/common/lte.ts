/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunction } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

type Context = number | string;

interface Arguments {
  value: Context;
}

export function lte(): ExpressionFunction<'lte', Context, Arguments, boolean> {
  const { help, args: argHelp } = getFunctionHelp().lte;

  return {
    name: 'lte',
    type: 'boolean',
    context: {
      types: ['number', 'string'],
    },
    help,
    args: {
      value: {
        aliases: ['_'],
        types: ['number', 'string'],
        required: true,
        help: argHelp.value,
      },
    },
    fn: (context, args) => {
      const { value } = args;

      if (typeof context !== typeof value) {
        return false;
      }

      return context <= value;
    },
  };
}
