/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { querySchema } from '@kbn/es-query-server';
import { LAYER_TYPE } from '../../../../../common';
import {
  EMSFileSourceSchema,
  EMSTMSSourceSchema,
  TiledSingleLayerVectorSourceSchema,
  WMSSourceSchema,
  XYZTMSSourceSchema,
  kibanaTilemapSourceSchema,
} from '../source_schemas/source_schemas';
import { joinSourceSchema } from '../source_schemas/es_join_source_schemas';
import { EMSVectorTileStyleSchema, heatmapStyleSchema } from '../style_schemas/style_schemas';
import { vectorStyleSchema } from '../style_schemas/vector_style_schemas/vector_style_schemas';
import {
  ESGeoGridSourceSchema,
  ESGeoLineSourceSchema,
  ESPewPewSourceSchema,
} from '../source_schemas/es_agg_source_schemas';
import { ESQLSourceSchema, ESSearchSourceSchema } from '../source_schemas/es_source_schemas';

export const attributionSchema = z
  .object({
    label: z.string(),
    url: z.url(),
  })
  .strict();

const layerSchema = z
  .object({
    alpha: z.number().min(0).max(1).default(0.75).optional().meta({
      description: 'Layer opacity',
    }),
    attribution: attributionSchema.optional(),
    id: z.string(),
    includeInFitToBounds: z.boolean().default(false).optional().meta({
      description: 'Set to false to exclude layer in fit to bounds computation',
    }),
    label: z.string().optional().meta({
      description: 'Layer name displayed in UI',
    }),
    maxZoom: z.number().min(0).max(24).optional().meta({
      description:
        'Layer visibility max zoom level. Layer displayed when map zoom level is less than or equal to maxZoom. When both maxZoom and minZoom are provided, layer is displayed when map zoom level is between maxZoom and minZoom.',
    }),
    minZoom: z.number().min(0).max(24).optional().meta({
      description:
        'Layer visibility min zoom level. Layer displayed when map zoom level is greater than or equal to minZoom.  When both maxZoom and minZoom are provided, layer is displayed when map zoom level is between maxZoom and minZoom.',
    }),
    parent: z.string().optional().meta({
      description:
        'Layers can be organized in a hierically for easy management in the UI. Use parent to specfify the id of LAYER_GROUP that contains this layer',
    }),
    query: querySchema.optional(),
    visible: z.boolean().default(true).optional().meta({
      description: `When set to false, layer will appear in legend as 'hidden' and no load data`,
    }),
  })
  .strict();

export const EMSVectorTileLayerSchema = layerSchema
  .extend({
    areLabelsOnTop: z.boolean().optional().meta({
      description:
        'Set to true to display labels on top of all layers regardless of layer ordering',
    }),
    locale: z.string().optional(),
    sourceDescriptor: EMSTMSSourceSchema,
    style: EMSVectorTileStyleSchema.optional(),
    type: z.literal(LAYER_TYPE.EMS_VECTOR_TILE),
  })
  .strict();

export const heatmapLayerSchema = layerSchema
  .extend({
    sourceDescriptor: ESGeoGridSourceSchema,
    style: heatmapStyleSchema.optional(),
    type: z.literal(LAYER_TYPE.HEATMAP),
  })
  .strict();

export const layerGroupSchema = layerSchema
  .extend({
    label: z.string(),
    type: z.literal(LAYER_TYPE.LAYER_GROUP),
    visible: z.boolean(),
  })
  .strict();

export const rasterLayerSchema = layerSchema
  .extend({
    sourceDescriptor: z.union([
      z
        .object({
          type: z.string(),
        })
        .loose(),
      kibanaTilemapSourceSchema,
      WMSSourceSchema,
      XYZTMSSourceSchema,
    ]),
    type: z.literal(LAYER_TYPE.RASTER_TILE),
  })
  .strict();

const joinSchema = z
  .object({
    leftField: z.string().optional(),
    right: joinSourceSchema,
  })
  .strict();

export const vectorLayerSchema = layerSchema
  .extend({
    disableTooltips: z.boolean().default(false).optional().meta({
      description: 'Set to true to disable tooltip for layer features',
    }),
    joins: z.array(joinSchema).optional(),
    sourceDescriptor: z.union([
      z
        .object({
          type: z.string(),
        })
        .loose(),
      EMSFileSourceSchema,
      TiledSingleLayerVectorSourceSchema,
      ESGeoGridSourceSchema,
      ESGeoLineSourceSchema,
      ESPewPewSourceSchema,
      ESSearchSourceSchema,
      ESQLSourceSchema,
    ]),
    style: vectorStyleSchema.optional(),
    type: z.union([
      z.literal(LAYER_TYPE.BLENDED_VECTOR),
      z.literal(LAYER_TYPE.GEOJSON_VECTOR),
      z.literal(LAYER_TYPE.MVT_VECTOR),
    ]),
  })
  .strict();

export const layersSchema = z.union([
  EMSVectorTileLayerSchema,
  heatmapLayerSchema,
  layerGroupSchema,
  rasterLayerSchema,
  vectorLayerSchema,
  z.object({}).loose(),
]);
