/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction, Datatable } from 'src/plugins/expressions/common';
import { Render } from '../../../types';

interface Arguments {
  columns?: string[];
  filterGroup: string;
}

export function multiFilterControl(): ExpressionFunction<
  'multiFilterControl',
  Datatable,
  Arguments,
  Render<Arguments>
> {
  return {
    name: 'multiFilterControl',
    aliases: [],
    type: 'render',
    context: {
      types: ['datatable'],
    },
    help: 'Multi-filter control',
    args: {
      columns: {
        types: ['string'],
        multi: true,
        aliases: ['field', 'c'],
        help: 'The columns to include.',
      },
      filterGroup: {
        types: ['string'],
        help: 'The name of the grouping filter, if applicable.',
      },
    },
    fn: (context, args) => {
      return {
        type: 'render',
        as: 'multi_filter',
        value: { datatable: context, ...args },
      };
    },
  };
}
