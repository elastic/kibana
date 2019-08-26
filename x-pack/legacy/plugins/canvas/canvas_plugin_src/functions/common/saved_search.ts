/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { SearchInput } from 'src/legacy/core_plugins/kibana/public/discover/embeddable';
import {
  EmbeddableTypes,
  EmbeddableExpressionType,
  EmbeddableExpression,
} from '../../expression_types';

import { buildEmbeddableFilters } from '../../../server/lib/build_embeddable_filters';
import { Filter, SearchSort } from '../../../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  id: string;
  title: string | null;
  columns: string[];
  sort: SearchSort[];
}

type Return = EmbeddableExpression<Partial<SearchInput> & { id: SearchInput['id'] }>;

export function savedSearch(): ExpressionFunction<'savedSearch', Filter | null, Arguments, Return> {
  const { help, args: argHelp } = getFunctionHelp().savedSearch;
  return {
    name: 'savedSearch',
    help,
    args: {
      id: {
        types: ['string'],
        required: true,
        help: argHelp.id,
      },
      title: {
        types: ['string'],
        required: false,
        help: argHelp.title,
      },
      columns: {
        types: ['string'],
        required: false,
        multi: true,
        help: argHelp.columns,
      },
      sort: {
        types: ['searchSort'],
        required: false,
        multi: true,
        help: argHelp.sort,
      },
    },
    type: EmbeddableExpressionType,
    fn: (context, args) => {
      const filters = context ? context.and : [];

      const sort = Array.isArray(args.sort)
        ? args.sort.map(s => [s.column, s.direction])
        : args.sort;

      return {
        type: EmbeddableExpressionType,
        input: {
          id: args.id,
          columns: args.columns,
          sort,
          ...buildEmbeddableFilters(filters),
          title: args.title ? args.title : undefined,
        },
        embeddableType: EmbeddableTypes.search,
      };
    },
  };
}
