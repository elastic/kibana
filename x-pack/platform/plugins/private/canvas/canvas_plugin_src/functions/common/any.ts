/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  condition: boolean[];
}

export function any(): ExpressionFunctionDefinition<'any', null, Arguments, boolean> {
  const { help, args: argHelp } = getFunctionHelp().any;

  return {
    name: 'any',
    type: 'boolean',
    inputTypes: ['null'],
    help,
    args: {
      condition: {
        aliases: ['_'],
        types: ['boolean'],
        required: true,
        multi: true,
        help: argHelp.condition,
      },
    },
    fn: (input, args) => {
      const conditions = args.condition || [];
      return conditions.some(Boolean);
    },
  };
}
