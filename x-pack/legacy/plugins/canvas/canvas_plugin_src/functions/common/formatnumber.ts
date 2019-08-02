/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  format: string;
}

export function formatnumber(): ExpressionFunction<'formatnumber', number, Arguments, string> {
  const { help, args: argHelp } = getFunctionHelp().formatnumber;

  return {
    name: 'formatnumber',
    type: 'string',
    help,
    context: {
      types: ['number'],
    },
    args: {
      format: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.format,
        required: true,
      },
    },
    fn: (context, args) => {
      if (!args.format) {
        return String(context);
      }
      return numeral(context).format(args.format);
    },
  };
}
