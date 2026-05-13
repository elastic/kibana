/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SOURCE_TYPES } from '../../../../../common';
import { MVT_FIELD_TYPE } from '../../../../../common/constants';
import {
  ESGeoGridSourceSchema,
  ESGeoLineSourceSchema,
  ESPewPewSourceSchema,
} from './es_agg_source_schemas';
import { ESQLSourceSchema, ESSearchSourceSchema } from './es_source_schemas';

export const EMSFileSourceSchema = z
  .object({
    id: z.string().meta({
      description: 'Administrative boundaries layer id from Elastic Maps Service (EMS).',
    }),
    type: z.literal(SOURCE_TYPES.EMS_FILE),
    tooltipProperties: z.array(z.string()).optional().meta({
      description: 'Administrative boundary properties displayed in tooltip.',
    }),
  })
  .strict()
  .meta({
    description: 'Administrative boundaries from Elastic Maps Service (EMS).',
  });

export const EMSTMSSourceSchema = z
  .object({
    id: z.string().optional().meta({
      description:
        'Tile Map Service (TMS) layer id from Elastic Maps Service (EMS). Required when isAutoSelect is false.',
    }),
    type: z.literal(SOURCE_TYPES.EMS_TMS),
    isAutoSelect: z.boolean().default(false).optional().meta({
      description:
        'When true, EMS TMS layer mirrors the Kibana theme, displaying light basemap tiles with light theme and dark basemap tiles with dark theme.',
    }),
    lightModeDefault: z.string().optional().meta({
      description:
        'BWC flag to preserve auto selected bright basemap tiles for maps created before 8.0.',
    }),
  })
  .strict()
  .meta({
    description: 'Basemap from Elastic Maps Service (EMS) Tile Map Service (TMS).',
  });

export const kibanaTilemapSourceSchema = z
  .object({
    type: z.literal(SOURCE_TYPES.KIBANA_TILEMAP),
  })
  .strict()
  .meta({
    description: `Tile map service configured by 'map.tilemap.url' kibana.yml setting.`,
  });

export const WMSSourceSchema = z
  .object({
    serviceUrl: z.url().meta({
      description: 'WMS URL',
    }),
    layers: z.string().meta({
      description: 'Comma separated list of layer names',
    }),
    styles: z.string().meta({
      description: 'Comma separated list of style names',
    }),
    type: z.literal(SOURCE_TYPES.WMS),
  })
  .strict()
  .meta({
    description: 'Raster source from Web Map Service (WMS)',
  });

export const XYZTMSSourceSchema = z
  .object({
    urlTemplate: z.url().meta({
      description: 'TMS URL',
    }),
    type: z.literal(SOURCE_TYPES.EMS_XYZ),
  })
  .strict()
  .meta({
    description: 'Raster source from Tile Map Service (TMS)',
  });

export const MVTFieldSchema = z.object({
  name: z.string(),
  type: z.union([z.literal(MVT_FIELD_TYPE.NUMBER), z.literal(MVT_FIELD_TYPE.STRING)]),
});

export const TiledSingleLayerVectorSourceSchema = z
  .object({
    fields: z.array(MVTFieldSchema).optional(),
    layerName: z.string().meta({
      description: 'source layer name',
    }),
    maxSourceZoom: z.number().min(0).max(24).default(24).optional().meta({
      description:
        'Maximum zoom levels of the availability of the a particular layerName in the tileset at urlTemplate.',
    }),
    minSourceZoom: z.number().min(0).max(24).default(0).meta({
      description:
        'Minimum zoom levels of the availability of the a particular layerName in the tileset at urlTemplate.',
    }),
    urlTemplate: z.url().meta({
      description: 'MVT URL',
    }),
    tooltipProperties: z.array(z.string()).optional().meta({
      description: 'Vector feature properties displayed in tooltip.',
    }),
    type: z.literal(SOURCE_TYPES.MVT_SINGLE_LAYER),
  })
  .strict()
  .meta({
    description: 'Vector tile source that displays a single source layer',
  });

export const sourceSchema = z.union([
  z
    .object({
      type: z.string(),
    })
    .loose(),
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
