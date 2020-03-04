/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import squel from 'squel';
import { ExpressionFunction } from 'src/plugins/expressions/common';
// @ts-ignore untyped local
import { queryEsSQL } from '../../../server/lib/query_es_sql';
import { Filter } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  index: string;
  query: string;
  fields: string;
  count: number;
}

export function esbasic(): ExpressionFunction<'esbasic', Filter, Arguments, any> {
  const { help, args: argHelp } = getFunctionHelp().esbasic;

  return {
    name: 'esbasic',
    type: 'datatable',
    help,
    context: {
      types: ['filter'],
    },
    args: {
      query: {
        types: ['string'],
        aliases: ['_', 'q'],
        help: argHelp.query,
        default: '-_index:.kibana',
      },
      count: {
        types: ['number'],
        default: 1000,
        help: argHelp.count,
      },
      fields: {
        help: argHelp.fields,
        types: ['string'],
      },
      index: {
        types: ['string'],
        default: '_all',
        help: argHelp.index,
      },
    },
    fn: (context, args, handlers) => {
      const { count, index, fields } = args;

      context.and = context.and.concat([
        {
          type: 'luceneQueryString',
          query: args.query,
          and: [],
        },
      ]);

      let query = squel.select({
        autoQuoteTableNames: true,
        autoQuoteFieldNames: true,
        autoQuoteAliasNames: true,
        nameQuoteCharacter: '"',
      });

      if (index) {
        query.from(index);
      }

      if (fields) {
        const allFields = fields.split(',').map(field => field.trim());
        allFields.forEach(field => (query = query.field(field)));
      }

      return queryEsSQL(handlers.elasticsearchClient, {
        count,
        query: query.toString(),
        filter: context.and,
      });
    },
  };
}
