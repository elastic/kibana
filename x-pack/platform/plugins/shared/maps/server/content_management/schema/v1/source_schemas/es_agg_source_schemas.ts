/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { SOURCE_TYPES } from '../../../../../common';
import {
  AGG_TYPE,
  GRID_RESOLUTION,
  MASK_OPERATOR,
  RENDER_AS,
} from '../../../../../common/constants';
import { BaseESSourceSchema } from './es_source_schemas';

const aggMaskSchema = schema.object(
  {
    operator: schema.oneOf([
      schema.literal(MASK_OPERATOR.ABOVE),
      schema.literal(MASK_OPERATOR.BELOW),
    ]),
    value: schema.number(),
  },
  {
    meta: {
      description: 'Hide cluster when metric value meets mask criteria.',
    },
  }
);

export const countAggSchema = schema.object({
  label: schema.maybe(schema.string()),
  mask: schema.maybe(aggMaskSchema),
  type: schema.literal(AGG_TYPE.COUNT),
});

export const fieldedAggSchema = schema.object({
  field: schema.maybe(schema.string()),
  label: schema.maybe(schema.string()),
  mask: schema.maybe(aggMaskSchema),
  type: schema.oneOf([
    schema.literal(AGG_TYPE.UNIQUE_COUNT),
    schema.literal(AGG_TYPE.MAX),
    schema.literal(AGG_TYPE.MIN),
    schema.literal(AGG_TYPE.SUM),
    schema.literal(AGG_TYPE.AVG),
    schema.literal(AGG_TYPE.TERMS),
  ]),
});

export const percentileAggSchema = schema.object({
  field: schema.maybe(schema.string()),
  label: schema.maybe(schema.string()),
  mask: schema.maybe(aggMaskSchema),
  percentile: schema.maybe(schema.number()),
  type: schema.literal(AGG_TYPE.PERCENTILE),
});

export const AggSchema = schema.oneOf([countAggSchema, fieldedAggSchema, percentileAggSchema]);

// base schema for Elasticsearch DSL aggregation sources
export const BaseESAggSourceSchema = BaseESSourceSchema.extends({
  metrics: schema.maybe(
    schema.arrayOf(AggSchema, {
      defaultValue: [{ type: AGG_TYPE.COUNT }],
    })
  ),
});

export const ESGeoGridSourceSchema = BaseESAggSourceSchema.extends(
  {
    geoField: schema.string({
      meta: {
        description: 'Field containing indexed geo-point or geo-shape values.',
      },
    }),
    requestType: schema.oneOf([
      schema.literal(RENDER_AS.HEATMAP),
      schema.literal(RENDER_AS.POINT),
      schema.literal(RENDER_AS.GRID),
      schema.literal(RENDER_AS.HEX),
    ]),
    resolution: schema.oneOf([
      schema.literal(GRID_RESOLUTION.COARSE),
      schema.literal(GRID_RESOLUTION.FINE),
      schema.literal(GRID_RESOLUTION.MOST_FINE),
      schema.literal(GRID_RESOLUTION.SUPER_FINE),
    ]),
    type: schema.literal(SOURCE_TYPES.ES_GEO_GRID),
  },
  {
    meta: {
      description:
        'Vector feature source returning points and polygons from Elasticsearch geotile_grid or geohex_grid aggregations. One feature is returned per bucket.',
    },
    unknowns: 'forbid',
  }
);

export const ESGeoLineSourceSchema = BaseESAggSourceSchema.extends(
  {
    geoField: schema.string({
      meta: {
        description: 'Field containing indexed geo-point values.',
      },
    }),
    groupByTimeseries: schema.maybe(
      schema.boolean({
        defaultValue: false,
        meta: {
          description: `When true, results are grouped by time_series aggregation, creating a line feature for each time_series group.`,
        },
      })
    ),
    lineSimplificationSize: schema.maybe(
      schema.number({
        max: 10000,
        min: 1,
        defaultValue: 500,
        meta: {
          description: `The maximum number of points for each line. Line is simplifed when threshold is exceeded. Use smaller values for better performance.`,
        },
      })
    ),
    splitField: schema.maybe(
      schema.string({
        meta: {
          description: `Field used to group results by term aggregation, creating a line feature for each term. Required when groupByTimeseries is false. Ignored when groupByTimeseries is true.`,
        },
      })
    ),
    sortField: schema.maybe(
      schema.string({
        meta: {
          description: `Numeric field used as the sort key for ordering the points. Required when groupByTimeseries is false. Ignored when groupByTimeseries is true.`,
        },
      })
    ),
    type: schema.literal(SOURCE_TYPES.ES_GEO_LINE),
  },
  {
    meta: {
      description:
        'Vector feature source returning lines from Elasticsearch geo_line aggregation. One feature is returned per group.',
    },
    unknowns: 'forbid',
  }
);

export const ESPewPewSourceSchema = BaseESAggSourceSchema.extends(
  {
    destGeoField: schema.string({
      meta: {
        description: `Field containing indexed geo-point values.`,
      },
    }),
    sourceGeoField: schema.string({
      meta: {
        description: `Field containing indexed geo-point values.`,
      },
    }),
    type: schema.literal(SOURCE_TYPES.ES_PEW_PEW),
  },
  {
    meta: {
      description:
        'Vector feature source returning lines from Elasticsearch nested geotile_grid aggregation. Results grouped by destintation point, creating one feature per destination point and source geotile_grid bucket.',
    },
    unknowns: 'forbid',
  }
);
