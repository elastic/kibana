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
// import { VisualizeInput } from '../../../../../../../src/legacy/core_plugins/kibana/public/visualize/embeddable';
import { buildEmbeddableFilters } from '../../../server/lib/build_embeddable_filters';
import { Filter } from '../../../types';

interface Arguments {
  id: string;
}

// TODO: Importing from visualize/embeddable chokes type_check script
// Using an any here now until we can get that resolved
type Return = EmbeddableExpression</* VisualizeInput */ any & { id: string }>;

export function savedVisualization(): ExpressionFunction<
  'savedVisualization',
  Filter | null,
  Arguments,
  Return
> {
  return {
    name: 'savedVisualization',
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
        embeddableType: EmbeddableTypes.visualization,
      };
    },
  };
}
