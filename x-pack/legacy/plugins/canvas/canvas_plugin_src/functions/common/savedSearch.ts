/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import {
  EmbeddableTypes,
  EmbeddableExpressionType,
  EmbeddableExpression,
} from '../../expression_types';

import { SearchInput } from '../../../../../../../src/legacy/core_plugins/kibana/public/discover/embeddable';
import { buildEmbeddableFilters } from '../../../server/lib/build_embeddable_filters';
import { Filter } from '../../../types';

interface Arguments {
  id: string;
}

type Return = EmbeddableExpression<Partial<SearchInput> & { id: SearchInput['id'] }>;

export function savedSearch(): ExpressionFunction<'savedSearch', Filter | null, Arguments, Return> {
  return {
    name: 'savedSearch',
    help: 'Render a Saved Search Query',
    args: {
      id: {
        types: ['string'],
        required: false,
        help: 'Id of the saved search',
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
