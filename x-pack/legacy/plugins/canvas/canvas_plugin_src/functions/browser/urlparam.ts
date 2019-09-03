/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'url';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  param: string;
  default: string;
}

export function urlparam(): ExpressionFunction<'urlparam', null, Arguments, string | string[]> {
  const { help, args: argHelp } = getFunctionHelp().urlparam;

  return {
    name: 'urlparam',
    aliases: [],
    type: 'string',
    help,
    context: {
      types: ['null'],
    },
    args: {
      param: {
        types: ['string'],
        aliases: ['_', 'var', 'variable'],
        help: argHelp.param,
        multi: false,
        required: true,
      },
      default: {
        types: ['string'],
        default: '""',
        help: argHelp.default,
      },
    },
    fn: (_context, args) => {
      const query = parse(window.location.href, true).query;
      return query[args.param] || args.default;
    },
  };
}
