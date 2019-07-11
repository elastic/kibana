/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  value: Array<string | number | boolean>;
}

export function string(): ExpressionFunction<'string', null, Arguments, string> {
  const { help, args: argHelp } = getFunctionHelp().string;

  return {
    name: 'string',
    context: {
      types: ['null'],
    },
    aliases: [],
    type: 'string',
    help,
    args: {
      value: {
        aliases: ['_'],
        types: ['string', 'number', 'boolean'],
        multi: true,
        help: argHelp.value,
      },
    },
    fn: (_context, args) => args.value.join(''),
  };
}
