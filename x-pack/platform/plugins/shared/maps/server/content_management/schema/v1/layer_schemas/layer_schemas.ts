/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
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

export const attributionSchema = schema.object({
  label: schema.string(),
  url: schema.uri(),
});

const layerSchema = schema.object({
  alpha: schema.maybe(
    schema.number({
      defaultValue: 0.75,
      min: 0,
      max: 1,
      meta: {
        description: 'Layer opacity',
      },
    })
  ),
  attribution: schema.maybe(attributionSchema),
  id: schema.string(),
  includeInFitToBounds: schema.maybe(
    schema.boolean({
      defaultValue: false,
      meta: {
        description: 'Set to false to exclude layer in fit to bounds computation',
      },
    })
  ),
  label: schema.maybe(
    schema.string({
      meta: {
        description: 'Layer name displayed in UI',
      },
    })
  ),
  maxZoom: schema.maybe(
    schema.number({
      min: 0,
      max: 24,
      meta: {
        description:
          'Layer visibility max zoom level. Layer displayed when map zoom level is less than or equal to maxZoom. When both maxZoom and minZoom are provided, layer is displayed when map zoom level is between maxZoom and minZoom.',
      },
    })
  ),
  minZoom: schema.maybe(
    schema.number({
      min: 0,
      max: 24,
      meta: {
        description:
          'Layer visibility min zoom level. Layer displayed when map zoom level is greater than or equal to minZoom.  When both maxZoom and minZoom are provided, layer is displayed when map zoom level is between maxZoom and minZoom.',
      },
    })
  ),
  parent: schema.maybe(
    schema.string({
      meta: {
        description:
          'Layers can be organized in a hierically for easy management in the UI. Use parent to specfify the id of LAYER_GROUP that contains this layer',
      },
    })
  ),
  query: schema.maybe(querySchema),
  visible: schema.maybe(
    schema.boolean({
      defaultValue: true,
      meta: {
        description: `When set to false, layer will appear in legend as 'hidden' and no load data`,
      },
    })
  ),
});

export const EMSVectorTileLayerSchema = layerSchema.extends({
  areLabelsOnTop: schema.maybe(
    schema.boolean({
      meta: {
        description:
          'Set to true to display labels on top of all layers regardless of layer ordering',
      },
    })
  ),
  locale: schema.maybe(schema.string()),
  sourceDescriptor: EMSTMSSourceSchema,
  style: schema.maybe(EMSVectorTileStyleSchema),
  type: schema.literal(LAYER_TYPE.EMS_VECTOR_TILE),
});

export const heatmapLayerSchema = layerSchema.extends({
  sourceDescriptor: ESGeoGridSourceSchema,
  style: schema.maybe(heatmapStyleSchema),
  type: schema.literal(LAYER_TYPE.HEATMAP),
});

export const layerGroupSchema = layerSchema.extends({
  label: schema.string(),
  type: schema.literal(LAYER_TYPE.LAYER_GROUP),
  visible: schema.boolean(),
});

export const rasterLayerSchema = layerSchema.extends({
  sourceDescriptor: schema.oneOf([
    schema.object(
      {
        type: schema.string(),
      },
      {
        unknowns: 'allow',
      }
    ),
    kibanaTilemapSourceSchema,
    WMSSourceSchema,
    XYZTMSSourceSchema,
  ]),
  type: schema.literal(LAYER_TYPE.RASTER_TILE),
});

const joinSchema = schema.object({
  leftField: schema.maybe(schema.string()),
  right: joinSourceSchema,
});

export const vectorLayerSchema = layerSchema.extends({
  disableTooltips: schema.maybe(
    schema.boolean({
      defaultValue: false,
      meta: {
        description: 'Set to true to disable tooltip for layer features',
      },
    })
  ),
  joins: schema.maybe(schema.arrayOf(joinSchema)),
  sourceDescriptor: schema.oneOf([
    schema.object(
      {
        type: schema.string(),
      },
      {
        unknowns: 'allow',
      }
    ),
    EMSFileSourceSchema,
    TiledSingleLayerVectorSourceSchema,
    ESGeoGridSourceSchema,
    ESGeoLineSourceSchema,
    ESPewPewSourceSchema,
    ESSearchSourceSchema,
    ESQLSourceSchema,
  ]),
  style: schema.maybe(vectorStyleSchema),
  type: schema.oneOf([
    schema.literal(LAYER_TYPE.BLENDED_VECTOR),
    schema.literal(LAYER_TYPE.GEOJSON_VECTOR),
    schema.literal(LAYER_TYPE.MVT_VECTOR),
  ]),
});

export const layersSchema = schema.oneOf([
  EMSVectorTileLayerSchema,
  heatmapLayerSchema,
  layerGroupSchema,
  rasterLayerSchema,
  vectorLayerSchema,
  schema.object(
    {},
    {
      unknowns: 'allow',
    }
  ),
]);
