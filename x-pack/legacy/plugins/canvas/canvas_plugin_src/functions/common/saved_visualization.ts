/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions';
import { VisualizeInput } from 'src/legacy/core_plugins/visualizations/public/embeddable';
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

type Output = EmbeddableExpression<VisualizeInput>;

export function savedVisualization(): ExpressionFunctionDefinition<
  'savedVisualization',
  Filter | null,
  Arguments,
  Output
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
    fn: (input, { id }) => {
      const filters = input ? input.and : [];

      return {
        type: EmbeddableExpressionType,
        input: {
          id,
          disableTriggers: true,
          ...buildEmbeddableFilters(filters),
        },
        embeddableType: EmbeddableTypes.visualization,
      };
    },
  };
}
