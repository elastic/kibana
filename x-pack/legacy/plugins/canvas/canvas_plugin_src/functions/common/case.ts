/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  when: () => any;
  if: boolean;
  then: () => any;
}

interface Case {
  type: 'case';
  matches: boolean;
  result: any;
}

export function caseFn(): ExpressionFunction<'case', any, Arguments, Promise<Case>> {
  const { help, args: argHelp } = getFunctionHelp().case;

  return {
    name: 'case',
    type: 'case',
    help,
    args: {
      when: {
        aliases: ['_'],
        resolve: false,
        help: argHelp.when,
      },
      if: {
        types: ['boolean'],
        help: argHelp.if,
      },
      then: {
        resolve: false,
        required: true,
        help: argHelp.then,
      },
    },
    fn: async (context, args) => {
      const matches = await doesMatch(context, args);
      const result = matches ? await getResult(context, args) : null;
      return { type: 'case', matches, result };
    },
  };
}

async function doesMatch(context: any, args: Arguments) {
  if (typeof args.if !== 'undefined') {
    return args.if;
  }
  if (typeof args.when !== 'undefined') {
    return (await args.when()) === context;
  }
  return true;
}

async function getResult(context: any, args: Arguments) {
  if (typeof args.then !== 'undefined') {
    return await args.then();
  }
  return context;
}
