/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { SearchInput } from 'src/legacy/core_plugins/kibana/public/discover/np_ready/embeddable';
import {
  EmbeddableTypes,
  EmbeddableExpressionType,
  EmbeddableExpression,
} from '../../expression_types';

import { buildEmbeddableFilters } from '../../../server/lib/build_embeddable_filters';
import { Filter } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  id: string;
}

type Output = EmbeddableExpression<Partial<SearchInput> & { id: SearchInput['id'] }>;

export function savedSearch(): ExpressionFunctionDefinition<
  'savedSearch',
  Filter | null,
  Arguments,
  Output
> {
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
    fn: (input, { id }) => {
      const filters = input ? input.and : [];
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
