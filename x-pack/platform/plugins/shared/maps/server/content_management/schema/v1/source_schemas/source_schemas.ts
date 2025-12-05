/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SOURCE_TYPES } from '../../../../../common';
import { MVT_FIELD_TYPE } from '../../../../../common/constants';
import {
  ESGeoGridSourceSchema,
  ESGeoLineSourceSchema,
  ESPewPewSourceSchema,
} from './es_agg_source_schemas';
import { ESQLSourceSchema, ESSearchSourceSchema } from './es_source_schemas';

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
            'When true, EMS TMS layer mirrors the Kibana theme, displaying light basemap tiles with light theme and dark basemap tiles with dark theme.',
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

export const kibanaTilemapSourceSchema = schema.object(
  {
    type: schema.literal(SOURCE_TYPES.KIBANA_TILEMAP),
  },
  {
    meta: {
      description: `Tile map service configured by 'map.tilemap.url' kibana.yml setting.`,
    },
    unknowns: 'forbid',
  }
);

export const WMSSourceSchema = schema.object(
  {
    serviceUrl: schema.uri({
      meta: {
        description: 'WMS URL',
      },
    }),
    layers: schema.string({
      meta: {
        description: 'Comma separated list of layer names',
      },
    }),
    styles: schema.string({
      meta: {
        description: 'Comma separated list of style names',
      },
    }),
    type: schema.literal(SOURCE_TYPES.WMS),
  },
  {
    meta: {
      description: 'Raster source from Web Map Service (WMS)',
    },
    unknowns: 'forbid',
  }
);

export const XYZTMSSourceSchema = schema.object(
  {
    urlTemplate: schema.uri({
      meta: {
        description: 'TMS URL',
      },
    }),
    type: schema.literal(SOURCE_TYPES.EMS_XYZ),
  },
  {
    meta: {
      description: 'Raster source from Tile Map Service (TMS)',
    },
    unknowns: 'forbid',
  }
);

export const MVTFieldSchema = schema.object({
  name: schema.string(),
  type: schema.oneOf([
    schema.literal(MVT_FIELD_TYPE.NUMBER),
    schema.literal(MVT_FIELD_TYPE.STRING),
  ]),
});

export const TiledSingleLayerVectorSourceSchema = schema.object(
  {
    fields: schema.maybe(schema.arrayOf(MVTFieldSchema)),
    layerName: schema.string({
      meta: {
        description: 'source layer name',
      },
    }),
    maxSourceZoom: schema.maybe(
      schema.number({
        max: 24,
        min: 0,
        defaultValue: 24,
        meta: {
          description:
            'Maximum zoom levels of the availability of the a particular layerName in the tileset at urlTemplate.',
        },
      })
    ),
    minSourceZoom: schema.number({
      max: 24,
      min: 0,
      defaultValue: 0,
      meta: {
        description:
          'Minimum zoom levels of the availability of the a particular layerName in the tileset at urlTemplate.',
      },
    }),
    urlTemplate: schema.uri({
      meta: {
        description: 'MVT URL',
      },
    }),
    tooltipProperties: schema.maybe(
      schema.arrayOf(schema.string(), {
        meta: {
          description: 'Vector feature properties displayed in tooltip.',
        },
      })
    ),
    type: schema.literal(SOURCE_TYPES.MVT_SINGLE_LAYER),
  },
  {
    meta: {
      description: 'Vector tile source that displays a single source layer',
    },
    unknowns: 'forbid',
  }
);

export const sourceSchema = schema.oneOf([
  schema.object(
    {
      type: schema.string(),
    },
    {
      unknowns: 'allow',
    }
  ),
  EMSFileSourceSchema,
  EMSTMSSourceSchema,
  kibanaTilemapSourceSchema,
  WMSSourceSchema,
  XYZTMSSourceSchema,
  TiledSingleLayerVectorSourceSchema,
  ESGeoGridSourceSchema,
  ESGeoLineSourceSchema,
  ESPewPewSourceSchema,
  ESSearchSourceSchema,
  ESQLSourceSchema,
]);
