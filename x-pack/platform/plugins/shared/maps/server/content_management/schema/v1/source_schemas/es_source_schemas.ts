/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SortDirection } from '@kbn/data-plugin/common/search';
import { SCALING_TYPES, SOURCE_TYPES } from '../../../../../common';

const applyForceRefreshSchema = z.boolean().default(true).optional().meta({
  description: `When true, results are re-fetched when page's automatic refresh fires or user clicks 'Refresh'.`,
});

const narrowByGlobalSearch = z
  .boolean()
  .default(true)
  .optional()
  .meta({ description: `When true, results narrowed by page's search bar.` });

const narrowByGlobalTime = z
  .boolean()
  .default(true)
  .optional()
  .meta({ description: `When true, results narrowed by page's time range.` });

// base schema for Elasticsearch DSL sources
export const BaseESSourceSchema = z
  .object({
    applyForceRefresh: applyForceRefreshSchema,
    applyGlobalQuery: narrowByGlobalSearch,
    applyGlobalTime: narrowByGlobalTime,
    id: z.string().meta({ description: 'uuid.' }),
    indexPatternId: z.string().meta({ description: 'Data view id from which results are pulled.' }),
  })
  .strict()
  .meta({
    description: 'Elasticsearch JSON-based query language state',
  });

export const ESSearchSourceSchema = BaseESSourceSchema.extend({
  filterByMapBounds: z.boolean().default(true).optional(),
  geoField: z.string().meta({
    description: 'Field containing indexed geo-point or geo-shape values.',
  }),
  scalingType: z
    .union([
      z.literal(SCALING_TYPES.LIMIT),
      z.literal(SCALING_TYPES.CLUSTERS),
      z.literal(SCALING_TYPES.MVT),
      z.literal(SCALING_TYPES.TOP_HITS),
    ])
    .default(SCALING_TYPES.MVT)
    .optional()
    .meta({
      description: `Elastic limits results to the index.max_result_window index setting, which defaults to 10000. Use scalingType to adjust limit behavior. With ${SCALING_TYPES.LIMIT}, results limited to 10,000. With ${SCALING_TYPES.CLUSTERS}, clusters are returned when results exceed 10,000. With ${SCALING_TYPES.MVT}, results are returned as vector tiles. Each tile request is limited to the index.max_result_window index setting. With ${SCALING_TYPES.TOP_HITS}, the most recent documents per entity are returned.`,
    }),
  sortField: z.string().optional(),
  sortOrder: z
    .union([z.literal(SortDirection.asc), z.literal(SortDirection.desc)])
    .default(SortDirection.desc)
    .optional(),
  topHitsGroupByTimeseries: z
    .boolean()
    .default(false)
    .optional()
    .meta({
      description: `When true, top hits is grouped by time_series aggregation. Ignored when scalingType is not ${SCALING_TYPES.TOP_HITS}.`,
    }),
  topHitsSplitField: z
    .string()
    .optional()
    .meta({
      description: `Field used to group top hits by term aggregation. Required when scalingType is ${SCALING_TYPES.TOP_HITS} and topHitsGroupByTimeseries is false. Ignored when scalingType is not ${SCALING_TYPES.TOP_HITS} or topHitsGroupByTimeseries is true.`,
    }),
  topHitsSize: z
    .number()
    .optional()
    .meta({
      description: `Number of hits to gather per entity. Ignored when scalingType is not ${SCALING_TYPES.TOP_HITS}.`,
    }),
  tooltipProperties: z.array(z.string()).optional().meta({
    description: 'Document properties displayed in tooltip.',
  }),
  type: z.literal(SOURCE_TYPES.ES_SEARCH),
})
  .strict()
  .meta({
    description:
      'Vector tile or vector feature source returning points, lines, and polygons from Elasticsearch documents.',
  });

export const ESQLSourceSchema = z
  .object({
    applyForceRefresh: applyForceRefreshSchema,
    dateField: z.string().optional().meta({
      description: `Date field used to narrow ES|QL requests by global time range. Required when 'narrowByGlobalTime' is true.`,
    }),
    esql: z.string().meta({
      description: 'ES|QL statement returning at least one geo_point or geo_shape column.',
    }),
    geoField: z.string().optional().meta({
      description: `Geo field used to narrow ES|QL requests by visible map area and spatial filters drawn on map. Required when 'narrowByMapBounds' is true.`,
    }),
    id: z.string().meta({ description: 'uuid.' }),
    narrowByMapBounds: z.boolean().optional().meta({
      description: `When true, results narrowed by visible map area.`,
    }),
    narrowByGlobalSearch,
    narrowByGlobalTime,
    type: z.literal(SOURCE_TYPES.ESQL),
  })
  .strict()
  .meta({
    description:
      'Vector feature source returning points, lines, and polygons from Elasticsearch ES|QL request. One feature is returned per response row. Feature geometry is provided from first geo_point or geo_shape column.',
  });
