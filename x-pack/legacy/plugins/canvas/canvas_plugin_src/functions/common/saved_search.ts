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
import { Filter } from '../../../types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  id: string;
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
        required: false,
        help: argHelp.id,
      },
    },
    type: EmbeddableExpressionType,
    fn: (context, { id }) => {
      const filters = context ? context.and : [];
      return {
        type: EmbeddableExpressionType,
        input: {
          id,
          ...buildEmbeddableFilters(filters),
        },
        embeddableType: EmbeddableTypes.search,
      };
    },
  };
}
