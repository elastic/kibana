/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Filter as ESFilterType } from '@kbn/es-query';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { TimeRange } from 'ui/timefilter/time_history';
import { EmbeddableInput } from 'src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { buildEmbeddableFilters } from '../../../server/lib/build_embeddable_filters';
import { Filter, MapCenter } from '../../../types';
import {
  EmbeddableTypes,
  EmbeddableExpressionType,
  EmbeddableExpression,
} from '../../expression_types';
import { getFunctionHelp } from '../../strings';

interface Arguments {
  id: string;
  showLayersMenu: boolean;
  center: MapCenter | null;
  title: string | null;
}

// Map embeddable is missing proper typings, so type is just to document what we
// are expecting to pass to the embeddable
export type SavedMapInput = EmbeddableInput & {
  id: string;
  timeRange?: TimeRange;
  refreshConfig: {
    isPaused: boolean;
    interval: number;
  };
  hideFilterActions: true;
  filters: ESFilterType[];
  isLayerTOCOpen: boolean;
  mapCenter?: {
    lat: number;
    lon: number;
    zoom: number;
  };
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
      showLayersMenu: {
        types: ['boolean'],
        required: false,
        help: argHelp.showLayersMenu,
        default: false,
      },
      center: {
        types: ['mapCenter'],
        help: argHelp.center,
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
          ...buildEmbeddableFilters(filters),
          isLayerTOCOpen: args.showLayersMenu,

          refreshConfig: {
            isPaused: false,
            interval: 0,
          },

          mapCenter: center,
          hideFilterActions: true,
          title: args.title ? args.title : undefined,
        },
        embeddableType: EmbeddableTypes.map,
      };
    },
  };
}
