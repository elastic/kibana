/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { getFunctionHelp } from '../../../i18n';

export interface Arguments {
  format: string;
}

export function rounddate(): ExpressionFunctionDefinition<'rounddate', number, Arguments, number> {
  const { help, args: argHelp } = getFunctionHelp().rounddate;

  return {
    name: 'rounddate',
    type: 'number',
    help,
    inputTypes: ['number'],
    args: {
      format: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.format,
      },
    },
    fn: (input, args) => {
      if (!args.format) {
        return input;
      }
      return moment.utc(moment.utc(input).format(args.format), args.format).valueOf();
    },
  };
}
