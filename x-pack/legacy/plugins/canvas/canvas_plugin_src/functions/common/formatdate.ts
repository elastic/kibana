/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { ExpressionFunction } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n';

export interface Arguments {
  format: string;
}

export function formatdate(): ExpressionFunction<'formatdate', number | string, Arguments, string> {
  const { help, args: argHelp } = getFunctionHelp().formatdate;

  return {
    name: 'formatdate',
    type: 'string',
    help,
    context: {
      types: ['number', 'string'],
    },
    args: {
      format: {
        aliases: ['_'],
        types: ['string'],
        required: true,
        help: argHelp.format,
      },
    },
    fn: (context, args) => {
      if (!args.format) {
        return moment.utc(new Date(context)).toISOString();
      }
      return moment.utc(new Date(context)).format(args.format);
    },
  };
}
