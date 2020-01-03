/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/plugins/expressions/common';
import { getFunctionHelp } from '../../../i18n/functions';
import { TimeRange } from '../../../types';

interface Args {
  from: string;
  to: string;
}

export function timerange(): ExpressionFunction<'timerange', null, Args, TimeRange> {
  const { help, args: argHelp } = getFunctionHelp().timerange;
  return {
    name: 'timerange',
    help,
    type: 'timerange',
    context: {
      types: ['null'],
    },
    args: {
      from: {
        types: ['string'],
        required: true,
        help: argHelp.from,
      },
      to: {
        types: ['string'],
        required: true,
        help: argHelp.to,
      },
    },
    fn: (context, args) => {
      return {
        type: 'timerange',
        ...args,
      };
    },
  };
}
