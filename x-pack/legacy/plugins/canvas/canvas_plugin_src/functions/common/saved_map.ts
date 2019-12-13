/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/plugins/expressions/common/types';
import { TimeRange } from 'src/plugins/data/public';
import { EmbeddableInput } from 'src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { buildEmbeddableFilters } from '../../../server/lib/build_embeddable_filters';
import { Filter } from '../../../types';
import {
  EmbeddableTypes,
  EmbeddableExpressionType,
  EmbeddableExpression,
} from '../../expression_types';
import { getFunctionHelp } from '../../../i18n';
import { esFilters } from '../../../../../../../src/plugins/data/public';

interface Arguments {
  id: string;
}

// Map embeddable is missing proper typings, so type is just to document what we
// are expecting to pass to the embeddable
interface SavedMapInput extends EmbeddableInput {
  id: string;
  timeRange?: TimeRange;
  refreshConfig: {
    isPaused: boolean;
    interval: number;
  };
  filters: esFilters.Filter[];
}

type Return = EmbeddableExpression<SavedMapInput>;

export function savedMap(): ExpressionFunction<'savedMap', Filter | null, Arguments, Return> {
  const { help, args: argHelp } = getFunctionHelp().savedMap;
  return {
    name: 'savedMap',
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

          refreshConfig: {
            isPaused: false,
            interval: 0,
          },
        },
        embeddableType: EmbeddableTypes.map,
      };
    },
  };
}
