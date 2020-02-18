/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore untyped Elastic library
import { castProvider } from '@kbn/interpreter/common';
import { ExpressionFunctionDefinition } from 'src/plugins/expressions/public';
import { npStart } from 'ui/new_platform';
import { getFunctionHelp, getFunctionErrors } from '../../i18n';

interface Arguments {
  type: string[];
}

export function to(): ExpressionFunctionDefinition<'to', any, Arguments, any> {
  const { help, args: argHelp } = getFunctionHelp().to;
  const errors = getFunctionErrors().to;

  return {
    name: 'to',
    aliases: [],
    help,
    args: {
      type: {
        types: ['string'],
        help: argHelp.type,
        aliases: ['_'],
        multi: true,
      },
    },
    fn: (input, args) => {
      if (!args.type) {
        throw errors.missingType();
      }

      return castProvider(npStart.plugins.expressions.getTypes())(input, args.type);
    },
  };
}
