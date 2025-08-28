/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { LAYER_TYPE } from '../../../../../common';
import { sourceSchema } from '../source_schemas/source_schemas';
import { querySchema } from '../source_schemas/es_join_source_schemas';
import { styleSchema } from '../style_schemas/style_schemas';

export const attributionSchema = schema.object({
  label: schema.string(),
  url: schema.uri(),
});

export const layerSchema = schema.object({
  alpha: schema.maybe(schema.number({
    defaultValue:  0.75,
    min: 0,
    max: 1,
    meta: {
      description: 'Layer opacity'
    }
  })),
  areLabelsOnTop: schema.maybe(schema.boolean({
    meta: {
      description: 'Set to true to display labels on top of all layers regardless of layer ordering'
    }
  })),
  attribution: schema.maybe(schema.arrayOf(attributionSchema)),
  id: schema.string(),
  includeInFitToBounds: schema.maybe(schema.boolean({
    defaultValue: false,
    meta: {
      description: 'Set to false to exclude layer in fit to bounds computation'
    }
  })),
  label: schema.maybe(schema.string({
    meta: {
      description: 'layer name displayed in UI'
    }
  })),
  maxZoom:  schema.maybe(schema.number({
    min: 0,
    max: 24,
    meta: {
      description: 'Layer visibility max zoom level. Layer displayed when map zoom level is less than or equal to maxZoom. When both maxZoom and minZoom are provided, layer is displayed when map zoom level is between maxZoom and minZoom.'
    }
  })),
  minZoom:  schema.maybe(schema.number({
    min: 0,
    max: 24,
    meta: {
      description: 'Layer visibility min zoom level. Layer displayed when map zoom level is greater than or equal to minZoom.  When both maxZoom and minZoom are provided, layer is displayed when map zoom level is between maxZoom and minZoom.'
    }
  })),
  parent: schema.maybe(schema.string({
    meta: {
      description: 'Layers can be organized in a hierically for easy management in the UI. Use parent to specfify the id of LAYER_GROUP that contains this layer'
    }
  })),
  query: schema.maybe(querySchema),
  sourceDescriptor: sourceSchema,
  style: styleSchema,
  type: schema.oneOf([
    schema.literal(LAYER_TYPE.BLENDED_VECTOR),
    schema.literal(LAYER_TYPE.EMS_VECTOR_TILE),
    schema.literal(LAYER_TYPE.GEOJSON_VECTOR),
    schema.literal(LAYER_TYPE.HEATMAP),
    schema.literal(LAYER_TYPE.LAYER_GROUP),
    schema.literal(LAYER_TYPE.MVT_VECTOR),
    schema.literal(LAYER_TYPE.RASTER_TILE),
  ]),
  visible: schema.maybe(schema.boolean({
    defaultValue: true,
    meta: {
      description: `When set to false, layer will appear in legend as 'hidden' and no load data`
    }
  })),
});
