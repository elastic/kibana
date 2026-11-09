/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';
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
export const BaseESSourceSchema = lazySchema(() =>
  z
    .object({
      apply_force_refresh: applyForceRefreshSchema,
      apply_global_query: narrowByGlobalSearch,
      apply_global_time: narrowByGlobalTime,
      id: z.string().meta({ description: 'uuid.' }),
      index_pattern_id: z
        .string()
        .meta({ description: 'Data view id from which results are pulled.' }),
    })
    .strict()
    .meta({
      description: 'Elasticsearch JSON-based query language state',
    })
);

export const ESSearchSourceSchema = lazySchema(() =>
  BaseESSourceSchema.extend({
    filter_by_map_bounds: z.boolean().default(true).optional(),
    geo_field: z.string().meta({
      description: 'Field containing indexed geo-point or geo-shape values.',
    }),
    scaling_type: z
      .union([
        z.literal(SCALING_TYPES.LIMIT),
        z.literal(SCALING_TYPES.CLUSTERS),
        z.literal(SCALING_TYPES.MVT),
        z.literal(SCALING_TYPES.TOP_HITS),
      ])
      .default(SCALING_TYPES.MVT)
      .optional()
      .meta({
        description: `Elastic limits results to the index.max_result_window index setting, which defaults to 10000. Use scaling_type to adjust limit behavior. With ${SCALING_TYPES.LIMIT}, results limited to 10,000. With ${SCALING_TYPES.CLUSTERS}, clusters are returned when results exceed 10,000. With ${SCALING_TYPES.MVT}, results are returned as vector tiles. Each tile request is limited to the index.max_result_window index setting. With ${SCALING_TYPES.TOP_HITS}, the most recent documents per entity are returned.`,
      }),
    sort_field: z.string().optional(),
    sort_order: z
      .union([z.literal(SortDirection.asc), z.literal(SortDirection.desc)])
      .default(SortDirection.desc)
      .optional(),
    top_hits_group_by_timeseries: z
      .boolean()
      .default(false)
      .optional()
      .meta({
        description: `When true, top hits is grouped by time_series aggregation. Ignored when scaling_type is not ${SCALING_TYPES.TOP_HITS}.`,
      }),
    top_hits_split_field: z
      .string()
      .optional()
      .meta({
        description: `Field used to group top hits by term aggregation. Required when scaling_type is ${SCALING_TYPES.TOP_HITS} and top_hits_group_by_timeseries is false. Ignored when scaling_type is not ${SCALING_TYPES.TOP_HITS} or top_hits_group_by_timeseries is true.`,
      }),
    top_hits_size: z
      .number()
      .optional()
      .meta({
        description: `Number of hits to gather per entity. Ignored when scaling_type is not ${SCALING_TYPES.TOP_HITS}.`,
      }),
    tooltip_properties: z.array(z.string()).optional().meta({
      description: 'Document properties displayed in tooltip.',
    }),
    type: z.literal(SOURCE_TYPES.ES_SEARCH),
  }).meta({
    description:
      'Vector tile or vector feature source returning points, lines, and polygons from Elasticsearch documents.',
  })
);

export const ESQLSourceSchema = lazySchema(() =>
  z
    .object({
      apply_force_refresh: applyForceRefreshSchema,
      date_field: z.string().optional().meta({
        description: `Date field used to narrow ES|QL requests by global time range. Required when 'narrow_by_global_time' is true.`,
      }),
      esql: z.string().meta({
        description: 'ES|QL statement returning at least one geo_point or geo_shape column.',
      }),
      geo_field: z.string().optional().meta({
        description: `Geo field used to narrow ES|QL requests by visible map area and spatial filters drawn on map. Required when 'narrow_by_map_bounds' is true.`,
      }),
      id: z.string().meta({ description: 'uuid.' }),
      narrow_by_map_bounds: z.boolean().optional().meta({
        description: `When true, results narrowed by visible map area.`,
      }),
      narrow_by_global_search: narrowByGlobalSearch,
      narrow_by_global_time: narrowByGlobalTime,
      type: z.literal(SOURCE_TYPES.ESQL),
    })
    .strict()
    .meta({
      description:
        'Vector feature source returning points, lines, and polygons from Elasticsearch ES|QL request. One feature is returned per response row. Feature geometry is provided from first geo_point or geo_shape column.',
    })
);
