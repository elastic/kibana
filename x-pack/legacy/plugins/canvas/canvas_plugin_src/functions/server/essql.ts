/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
// @ts-ignore untyped local
import { queryEsSQL } from '../../../server/lib/query_es_sql';
import { Filter } from '../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  query: string;
  count: number;
  timezone: string;
}

export function essql(): ExpressionFunction<'essql', Filter, Arguments, any> {
  const { help, args: argHelp } = getFunctionHelp().essql;

  return {
    name: 'essql',
    type: 'datatable',
    context: {
      types: ['filter'],
    },
    help,
    args: {
      query: {
        aliases: ['_', 'q'],
        types: ['string'],
        help: argHelp.query,
      },
      count: {
        types: ['number'],
        help: argHelp.count,
        default: 1000,
      },
      timezone: {
        aliases: ['tz'],
        types: ['string'],
        default: 'UTC',
        help: argHelp.timezone,
      },
    },
    fn: (context, args, handlers) =>
      queryEsSQL(handlers.elasticsearchClient, { ...args, filter: context.and }),
  };
}
