/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { Filter, ExpressionFunction } from '../../../types';
import { getFunctionHelp, getFunctionErrors } from '../../../i18n';

interface Arguments {
  column: string;
  from: string;
  to: string;
  filterGroup: string;
}

export function timefilter(): ExpressionFunction<'timefilter', Filter, Arguments, Filter> {
  const { help, args: argHelp } = getFunctionHelp().timefilter;
  const errors = getFunctionErrors().timefilter;

  return {
    name: 'timefilter',
    aliases: [],
    type: 'filter',
    context: {
      types: ['filter'],
    },
    help,
    args: {
      column: {
        types: ['string'],
        aliases: ['field', 'c'],
        default: '@timestamp',
        help: argHelp.column,
      },
      from: {
        types: ['string'],
        aliases: ['f', 'start'],
        help: argHelp.from,
      },
      to: {
        types: ['string'],
        aliases: ['t', 'end'],
        help: argHelp.to,
      },
      filterGroup: {
        types: ['string'],
        help: 'The group name for the filter',
      },
    },
    fn: (context, args) => {
      if (!args.from && !args.to) {
        return context;
      }

      const { from, to, column } = args;
      const filter = {
        type: 'time',
        column,
        and: [],
      };

      function parseAndValidate(str: string): string {
        const moment = dateMath.parse(str);

        if (!moment || !moment.isValid()) {
          throw errors.invalidString(str);
        }

        return moment.toISOString();
      }

      if (!!to) {
        (filter as any).to = parseAndValidate(to);
      }

      if (!!from) {
        (filter as any).from = parseAndValidate(from);
      }

      return { ...context, and: [...context.and, filter] };
    },
  };
}
