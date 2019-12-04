/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunction } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  condition: boolean | null;
  then: () => Promise<any>;
  else: () => Promise<any>;
}

export function ifFn(): ExpressionFunction<'if', any, Arguments, any> {
  const { help, args: argHelp } = getFunctionHelp().if;

  return {
    name: 'if',
    help,
    args: {
      condition: {
        types: ['boolean', 'null'],
        aliases: ['_'],
        help: argHelp.condition,
      },
      then: {
        resolve: false,
        help: argHelp.then,
      },
      else: {
        resolve: false,
        help: argHelp.else,
      },
    },
    fn: async (context, args) => {
      if (args.condition) {
        if (typeof args.then === 'undefined') {
          return context;
        }
        return await args.then();
      } else {
        if (typeof args.else === 'undefined') {
          return context;
        }
        return await args.else();
      }
    },
  };
}
