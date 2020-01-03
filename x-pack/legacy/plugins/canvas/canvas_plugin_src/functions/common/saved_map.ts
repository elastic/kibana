/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/plugins/expressions/common/types';
import { TimeRange } from 'src/plugins/data/public';
import { EmbeddableInput } from 'src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { getQueryFilters } from '../../../server/lib/build_embeddable_filters';
import { Filter, MapCenter, TimeRange as TimeRangeArg } from '../../../types';
import {
  EmbeddableTypes,
  EmbeddableExpressionType,
  EmbeddableExpression,
} from '../../expression_types';
import { getFunctionHelp } from '../../../i18n';
import { esFilters } from '../../../../../../../src/plugins/data/public';

interface Arguments {
  id: string;
  center: MapCenter | null;
  title: string | null;
  timerange: TimeRangeArg | null;
}

// Map embeddable is missing proper typings, so type is just to document what we
// are expecting to pass to the embeddable
export type SavedMapInput = EmbeddableInput & {
  id: string;
  isLayerTOCOpen: boolean;
  timeRange?: TimeRange;
  refreshConfig: {
    isPaused: boolean;
    interval: number;
  };
  hideFilterActions: true;
  filters: esFilters.Filter[];
  mapCenter?: {
    lat: number;
    lon: number;
    zoom: number;
  };
};

const defaultTimeRange = {
  from: 'now-15m',
  to: 'now',
};

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
      center: {
        types: ['mapCenter'],
        help: argHelp.center,
        required: false,
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

      const center = args.center
        ? {
            lat: args.center.lat,
            lon: args.center.lon,
            zoom: args.center.zoom,
          }
        : undefined;

      return {
        type: EmbeddableExpressionType,
        input: {
          id: args.id,
          filters: getQueryFilters(filters),
          timeRange: args.timerange || defaultTimeRange,
          refreshConfig: {
            isPaused: false,
            interval: 0,
          },

          mapCenter: center,
          hideFilterActions: true,
          title: args.title ? args.title : undefined,
          isLayerTOCOpen: false,
        },
        embeddableType: EmbeddableTypes.map,
      };
    },
  };
}
