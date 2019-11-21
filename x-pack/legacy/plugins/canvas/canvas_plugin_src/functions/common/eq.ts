/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunction } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  value: Context;
}

type Context = boolean | number | string | null;

export function eq(): ExpressionFunction<'eq', Context, Arguments, boolean> {
  const { help, args: argHelp } = getFunctionHelp().eq;

  return {
    name: 'eq',
    type: 'boolean',
    help,
    context: {
      types: ['boolean', 'number', 'string', 'null'],
    },
    args: {
      value: {
        aliases: ['_'],
        types: ['boolean', 'number', 'string', 'null'],
        required: true,
        help: argHelp.value,
      },
    },
    fn: (context, args) => {
      return context === args.value;
    },
  };
}
