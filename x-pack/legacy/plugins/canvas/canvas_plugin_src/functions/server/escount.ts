/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
// @ts-ignore untyped local
import { buildESRequest } from '../../../server/lib/build_es_request';
import { Filter } from '../../../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  index: string | null;
  query: string;
}

export function escount(): ExpressionFunction<'escount', Filter, Arguments, any> {
  const { help, args: argHelp } = getFunctionHelp().escount;

  return {
    name: 'escount',
    type: 'number',
    help,
    context: {
      types: ['filter'],
    },
    args: {
      index: {
        types: ['string'],
        default: '_all',
        help: argHelp.index,
      },
      query: {
        types: ['string'],
        aliases: ['_', 'q'],
        help: argHelp.query,
        default: '"-_index:.kibana"',
      },
    },
    fn: (context, args, handlers) => {
      context.and = context.and.concat([
        {
          type: 'luceneQueryString',
          query: args.query,
          and: [],
        },
      ]);

      const esRequest = buildESRequest(
        {
          index: args.index,
          body: {
            query: {
              bool: {
                must: [{ match_all: {} }],
              },
            },
          },
        },
        context
      );

      return handlers
        .elasticsearchClient('count', esRequest)
        .then((resp: { count: number }) => resp.count);
    },
  };
}
