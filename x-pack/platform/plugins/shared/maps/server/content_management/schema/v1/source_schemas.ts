/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SortDirection } from '@kbn/data-plugin/common/search';
import { SOURCE_TYPES } from '../../../../common';
import {
  AGG_TYPE,
  GRID_RESOLUTION,
  MASK_OPERATOR,
  RENDER_AS,
  SCALING_TYPES,
} from '../../../../common/constants';

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

export const ESSearchSourceSchema = ESSourceSchema.extends(
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
      description:
        'Vector feature source returning points and polygons from Elasticsearch geotile_grid or geohex_grid aggregations. One feature is returned per bucket.',
    },
    unknowns: 'forbid',
  }
);

export const ESGeoLineSourceSchema = ESAggSourceSchema.extends(
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

export const ESPewPewSourceSchema = ESAggSourceSchema.extends(
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
