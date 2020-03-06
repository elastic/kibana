/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { TimeRange } from 'src/plugins/data/public';
import { EmbeddableInput } from 'src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { getQueryFilters } from '../../../public/lib/build_embeddable_filters';
import { Filter, TimeRange as TimeRangeArg } from '../../../types';
import {
  EmbeddableTypes,
  EmbeddableExpressionType,
  EmbeddableExpression,
} from '../../expression_types';
import { getFunctionHelp } from '../../../i18n';
import { Filter as DataFilter } from '../../../../../../../src/plugins/data/public';

interface Arguments {
  id: string;
  title: string | null;
  timerange: TimeRangeArg | null;
}

export type SavedLensInput = EmbeddableInput & {
  id: string;
  timeRange?: TimeRange;
  filters: DataFilter[];
};

const defaultTimeRange = {
  from: 'now-15m',
  to: 'now',
};

type Return = EmbeddableExpression<SavedLensInput>;

export function savedLens(): ExpressionFunctionDefinition<
  'savedLens',
  Filter | null,
  Arguments,
  Return
> {
  const { help, args: argHelp } = getFunctionHelp().savedLens;
  return {
    name: 'savedLens',
    help,
    args: {
      id: {
        types: ['string'],
        required: false,
        help: argHelp.id,
      },
      timerange: {
        types: ['timerange'],
        help: argHelp.timerange,
        required: false,
      },
      title: {
        types: ['string'],
        help: argHelp.title,
        required: false,
      },
    },
    type: EmbeddableExpressionType,
    fn: (context, args) => {
      const filters = context ? context.and : [];

      return {
        type: EmbeddableExpressionType,
        input: {
          id: args.id,
          filters: getQueryFilters(filters),
          timeRange: args.timerange || defaultTimeRange,
          title: args.title ? args.title : undefined,
          disableTriggers: true,
        },
        embeddableType: EmbeddableTypes.lens,
      };
    },
  };
}
