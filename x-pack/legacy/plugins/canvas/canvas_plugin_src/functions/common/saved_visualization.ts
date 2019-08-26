/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { VisualizeInput } from '../../../../../../../src/legacy/core_plugins/kibana/public/visualize/embeddable';
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
  title: string | null;
}

export { VisualizeInput };

type Return = EmbeddableExpression<VisualizeInput>;

export function savedVisualization(): ExpressionFunction<
  'savedVisualization',
  Filter | null,
  Arguments,
  Return
> {
  const { help, args: argHelp } = getFunctionHelp().savedVisualization;
  return {
    name: 'savedVisualization',
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
    },
    type: EmbeddableExpressionType,
    fn: (context, args) => {
      const filters = context ? context.and : [];

      return {
        type: EmbeddableExpressionType,
        input: {
          ...args,
          ...buildEmbeddableFilters(filters),
          title: args.title ? args.title : undefined,
        },
        embeddableType: EmbeddableTypes.visualization,
      };
    },
  };
}
