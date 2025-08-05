/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SOURCE_TYPES } from '../../../../common';
import { AGG_TYPE, GRID_RESOLUTION, MASK_OPERATOR, RENDER_AS } from '../../../../common/constants';

export const EMSFileSourceSchema = schema.object(
  {
    id: schema.string({
      meta: { description: 'Administrative boundaries layer id from Elastic Maps Service (EMS).' },
    }),
    type: schema.literal(SOURCE_TYPES.EMS_FILE),
    tooltipProperties: schema.maybe(
      schema.arrayOf(schema.string(), {
        meta: {
          description: 'Administrative boundary properties displayed in tooltip.',
        },
      })
    ),
  },
  {
    meta: {
      description: 'Administrative boundaries from Elastic Maps Service (EMS).',
    },
    unknowns: 'forbid',
  }
);

export const EMSTMSSourceSchema = schema.object(
  {
    id: schema.maybe(
      schema.string({
        meta: {
          description:
            'Tile Map Service (TMS) layer id from Elastic Maps Service (EMS). Required when isAutoSelect is false.',
        },
      })
    ),
    type: schema.literal(SOURCE_TYPES.EMS_TMS),
    isAutoSelect: schema.maybe(
      schema.boolean({
        defaultValue: false,
        meta: {
          description:
            'When true, EMS TMS layer mirrows the Kibana theme, displaying light basemap tiles with light theme and dark basemap tiles with dark theme.',
        },
      })
    ),
    lightModeDefault: schema.maybe(
      schema.string({
        meta: {
          description:
            'BWC flag to preserve auto selected bright basemap tiles for maps created before 8.0.',
        },
      })
    ),
  },
  {
    meta: {
      description: 'Basemap from Elastic Maps Service (EMS) Tile Map Service (TMS).',
    },
    unknowns: 'forbid',
  }
);

// base schema for Elasticsearch DSL sources
export const ESSourceSchema = schema.object(
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
export const ESAggSourceSchema = ESSourceSchema.extends({
  metrics: schema.arrayOf(AggSchema),
});

export const ESGeoGridSourceSchema = ESAggSourceSchema.extends(
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
      description: 'Clusters from documents grouped into grids and hexagons',
    },
    unknowns: 'forbid',
  }
);
