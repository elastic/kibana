/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  pattern: string;
  flags: string;
  replacement: string;
}
export function replace(): ExpressionFunction<'replace', string, Arguments, string> {
  const { help, args: argHelp } = getFunctionHelp().replace;

  return {
    name: 'replace',
    type: 'string',
    help,
    context: {
      types: ['string'],
    },
    args: {
      pattern: {
        aliases: ['_', 'regex'],
        types: ['string'],
        help: argHelp.pattern,
      },
      flags: {
        aliases: ['modifiers'],
        types: ['string'],
        help: argHelp.flags,
        default: 'g',
      },
      replacement: {
        types: ['string'],
        help: argHelp.replacement,
        default: '""',
      },
    },
    fn: (context, args) => context.replace(new RegExp(args.pattern, args.flags), args.replacement),
  };
}
