/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SortDirection } from '@kbn/data-plugin/common/search';
import { SCALING_TYPES, SOURCE_TYPES } from '../../../../../common';

// base schema for Elasticsearch DSL sources
export const BaseESSourceSchema = schema.object(
  {
    applyForceRefresh: schema.maybe(
      schema.boolean({
        defaultValue: true,
        meta: {
          description: `When true, results are re-fetched when page's automatic refresh fires or user clicks 'Refresh'.`,
        },
      })
    ),
    applyGlobalQuery: schema.maybe(
      schema.boolean({
        defaultValue: true,
        meta: { description: `When true, results narrowed by page's search bar.` },
      })
    ),
    applyGlobalTime: schema.maybe(
      schema.boolean({
        defaultValue: true,
        meta: { description: `When true, results narrowed by page's time range.` },
      })
    ),
    id: schema.string({
      meta: { description: 'uuid.' },
    }),
    indexPatternId: schema.string({
      meta: { description: 'Data view id from which results are pulled.' },
    }),
  },
  {
    meta: {
      description: 'Elasticsearch JSON-based query language state',
    },
    unknowns: 'forbid',
  }
);

export const ESSearchSourceSchema = BaseESSourceSchema.extends(
  {
    filterByMapBounds: schema.maybe(
      schema.boolean({
        defaultValue: true,
      })
    ),
    geoField: schema.string({
      meta: {
        description: 'Field containing indexed geo-point or geo-shape values.',
      },
    }),
    scalingType: schema.maybe(
      schema.oneOf(
        [
          schema.literal(SCALING_TYPES.LIMIT),
          schema.literal(SCALING_TYPES.CLUSTERS),
          schema.literal(SCALING_TYPES.MVT),
          schema.literal(SCALING_TYPES.TOP_HITS),
        ],
        {
          defaultValue: SCALING_TYPES.MVT,
          meta: {
            description: `Elastic limits results to the index.max_result_window index setting, which defaults to 10000. Use scalingType to adjust limit behavior. With ${SCALING_TYPES.LIMIT}, results limited to 10,000. With ${SCALING_TYPES.CLUSTERS}, clusters are returned when results exceed 10,000. With ${SCALING_TYPES.MVT}, results are returned as vector tiles. Each tile request is limited to the index.max_result_window index setting. With ${SCALING_TYPES.TOP_HITS}, the most recent documents per entity are returned.`,
          },
        }
      )
    ),
    sortField: schema.maybe(schema.string()),
    sortOrder: schema.maybe(
      schema.oneOf([schema.literal(SortDirection.asc), schema.literal(SortDirection.desc)], {
        defaultValue: SortDirection.desc,
      })
    ),
    topHitsGroupByTimeseries: schema.maybe(
      schema.boolean({
        defaultValue: false,
        meta: {
          description: `When true, top hits is grouped by time_series aggregation. Ignored when scalingType is not ${SCALING_TYPES.TOP_HITS}.`,
        },
      })
    ),
    topHitsSplitField: schema.maybe(
      schema.string({
        meta: {
          description: `Field used to group top hits by term aggregation. Required when scalingType is ${SCALING_TYPES.TOP_HITS} and topHitsGroupByTimeseries is false. Ignored when scalingType is not ${SCALING_TYPES.TOP_HITS} or topHitsGroupByTimeseries is true.`,
        },
      })
    ),
    topHitsSize: schema.maybe(
      schema.number({
        meta: {
          description: `Number of hits to gather per entity. Ignored when scalingType is not ${SCALING_TYPES.TOP_HITS}.`,
        },
      })
    ),
    tooltipProperties: schema.maybe(
      schema.arrayOf(schema.string(), {
        meta: {
          description: 'Document properties displayed in tooltip.',
        },
      })
    ),
    type: schema.literal(SOURCE_TYPES.ES_SEARCH),
  },
  {
    meta: {
      description:
        'Vector tile or vector feature source returning points, lines, and polygons from Elasticsearch documents.',
    },
    unknowns: 'forbid',
  }
);
