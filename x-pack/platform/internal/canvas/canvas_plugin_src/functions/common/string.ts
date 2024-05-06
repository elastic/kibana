/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  value: Array<string | number | boolean>;
}

export function string(): ExpressionFunctionDefinition<'string', null, Arguments, string> {
  const { help, args: argHelp } = getFunctionHelp().string;

  return {
    name: 'string',
    inputTypes: ['null'],
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
    fn: (input, args) => args.value.join(''),
  };
}
