/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Filter as ESFilterType } from '@kbn/es-query';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { TimeRange } from 'ui/timefilter/time_history';
import { EmbeddableInput } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public';
import { buildEmbeddableFilters } from '../../../server/lib/build_embeddable_filters';
import { Filter } from '../../../types';
import {
  EmbeddableTypes,
  EmbeddableExpressionType,
  EmbeddableExpression,
} from '../../expression_types';

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
  filters: ESFilterType[];
}

type Return = EmbeddableExpression<SavedMapInput>;

export function savedMap(): ExpressionFunction<'savedMap', Filter | null, Arguments, Return> {
  return {
    name: 'savedMap',
    help: 'Render a Saved Map',
    args: {
      id: {
        types: ['string'],
        required: false,
        help: 'Id of the saved map',
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
