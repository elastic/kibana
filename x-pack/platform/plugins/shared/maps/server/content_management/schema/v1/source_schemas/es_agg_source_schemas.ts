/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { SOURCE_TYPES } from '../../../../../common';
import {
  AGG_TYPE,
  GRID_RESOLUTION,
  MASK_OPERATOR,
  RENDER_AS,
} from '../../../../../common/constants';
import { BaseESSourceSchema } from './es_source_schemas';

const aggMaskSchema = z
  .object({
    operator: z.union([z.literal(MASK_OPERATOR.ABOVE), z.literal(MASK_OPERATOR.BELOW)]),
    value: z.number(),
  })
  .meta({
    description: 'Hide cluster when metric value meets mask criteria.',
  });

export const countAggSchema = z.object({
  label: z.string().optional(),
  mask: aggMaskSchema.optional(),
  type: z.literal(AGG_TYPE.COUNT),
});

export const fieldedAggSchema = z.object({
  field: z.string().optional(),
  label: z.string().optional(),
  mask: aggMaskSchema.optional(),
  type: z.union([
    z.literal(AGG_TYPE.UNIQUE_COUNT),
    z.literal(AGG_TYPE.MAX),
    z.literal(AGG_TYPE.MIN),
    z.literal(AGG_TYPE.SUM),
    z.literal(AGG_TYPE.AVG),
    z.literal(AGG_TYPE.TERMS),
  ]),
});

export const percentileAggSchema = z.object({
  field: z.string().optional(),
  label: z.string().optional(),
  mask: aggMaskSchema.optional(),
  percentile: z.number().optional(),
  type: z.literal(AGG_TYPE.PERCENTILE),
});

export const AggSchema = z.union([countAggSchema, fieldedAggSchema, percentileAggSchema]);

// base schema for Elasticsearch DSL aggregation sources
export const BaseESAggSourceSchema = BaseESSourceSchema.extend({
  metrics: z
    .array(AggSchema)
    .default([{ type: AGG_TYPE.COUNT }])
    .optional(),
}).strict();

export const ESGeoGridSourceSchema = BaseESAggSourceSchema.extend({
  geoField: z.string().meta({
    description: 'Field containing indexed geo-point or geo-shape values.',
  }),
  requestType: z.union([
    z.literal(RENDER_AS.HEATMAP),
    z.literal(RENDER_AS.POINT),
    z.literal(RENDER_AS.GRID),
    z.literal(RENDER_AS.HEX),
  ]),
  resolution: z.union([
    z.literal(GRID_RESOLUTION.COARSE),
    z.literal(GRID_RESOLUTION.FINE),
    z.literal(GRID_RESOLUTION.MOST_FINE),
    z.literal(GRID_RESOLUTION.SUPER_FINE),
  ]),
  type: z.literal(SOURCE_TYPES.ES_GEO_GRID),
})
  .meta({
    description:
      'Vector feature source returning points and polygons from Elasticsearch geotile_grid or geohex_grid aggregations. One feature is returned per bucket.',
  })
  .strict();

export const ESGeoLineSourceSchema = BaseESAggSourceSchema.extend({
  geoField: z.string().meta({
    description: 'Field containing indexed geo-point values.',
  }),
  groupByTimeseries: z.boolean().default(false).optional().meta({
    description: `When true, results are grouped by time_series aggregation, creating a line feature for each time_series group.`,
  }),
  lineSimplificationSize: z.number().min(1).max(10000).default(500).optional().meta({
    description: `The maximum number of points for each line. Line is simplifed when threshold is exceeded. Use smaller values for better performance.`,
  }),
  splitField: z.string().optional().meta({
    description: `Field used to group results by term aggregation, creating a line feature for each term. Required when groupByTimeseries is false. Ignored when groupByTimeseries is true.`,
  }),
  sortField: z.string().optional().meta({
    description: `Numeric field used as the sort key for ordering the points. Required when groupByTimeseries is false. Ignored when groupByTimeseries is true.`,
  }),
  type: z.literal(SOURCE_TYPES.ES_GEO_LINE),
}).meta({
  description:
    'Vector feature source returning lines from Elasticsearch geo_line aggregation. One feature is returned per group.',
});

export const ESPewPewSourceSchema = BaseESAggSourceSchema.extend({
  destGeoField: z.string().meta({
    description: `Field containing indexed geo-point values.`,
  }),
  sourceGeoField: z.string().meta({
    description: `Field containing indexed geo-point values.`,
  }),
  type: z.literal(SOURCE_TYPES.ES_PEW_PEW),
})
  .meta({
    description:
      'Vector feature source returning lines from Elasticsearch nested geotile_grid aggregation. Results grouped by destintation point, creating one feature per destination point and source geotile_grid bucket.',
  })
  .strict();
