/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { ExpressionFunction } from 'src/plugins/expressions/common/types';
import { getFunctionHelp } from '../../../i18n';

export interface Arguments {
  format: string;
}

export function rounddate(): ExpressionFunction<'rounddate', number, Arguments, number> {
  const { help, args: argHelp } = getFunctionHelp().rounddate;

  return {
    name: 'rounddate',
    type: 'number',
    help,
    context: {
      types: ['number'],
    },
    args: {
      format: {
        aliases: ['_'],
        types: ['string'],
        help: argHelp.format,
      },
    },
    fn: (context, args) => {
      if (!args.format) {
        return context;
      }
      return moment.utc(moment.utc(context).format(args.format), args.format).valueOf();
    },
  };
}
