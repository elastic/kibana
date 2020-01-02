/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/plugins/expressions/common/types';
import { VisualizeInput } from 'src/legacy/core_plugins/kibana/public/visualize_embeddable';
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
        embeddableType: EmbeddableTypes.visualization,
      };
    },
  };
}
