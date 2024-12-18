/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { getFunctionHelp } from '../../../i18n';

export interface Arguments {
  format: string;
}

export function formatnumber(): ExpressionFunctionDefinition<
  'formatnumber',
  number,
  Arguments,
  string
> {
  const { help, args: argHelp } = getFunctionHelp().formatnumber;

  return {
    name: 'formatnumber',
    type: 'string',
    help,
    inputTypes: ['number'],
    args: {
      format: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.format,
        required: true,
      },
    },
    fn: (input, args) => {
      if (!args.format) {
        return String(input);
      }
      return numeral(input).format(args.format);
    },
  };
}
