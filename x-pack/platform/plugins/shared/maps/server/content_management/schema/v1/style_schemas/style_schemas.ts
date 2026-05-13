/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { LAYER_STYLE_TYPE } from '../../../../../common/constants';
import { vectorStyleSchema } from './vector_style_schemas/vector_style_schemas';

export const EMSVectorTileStyleSchema = schema.object(
  {
    color: schema.string(),
    type: schema.literal(LAYER_STYLE_TYPE.EMS_VECTOR_TILE),
  },
  {
    meta: {
      description: 'Elastic Maps Service (EMS) Vector Tile style configuration.',
    },
  }
);

export const heatmapStyleSchema = schema.object(
  {
    colorRampName: schema.maybe(
      schema.oneOf(
        [
          schema.literal('Blues'),
          schema.literal('Greens'),
          schema.literal('Greys'),
          schema.literal('Reds'),
          schema.literal('Yellow to Red'),
          schema.literal('Green to Red'),
          schema.literal('Blue to Red'),
          schema.literal('theclassic'),
        ],
        {
          defaultValue: 'theclassic',
        }
      )
    ),
    type: schema.literal(LAYER_STYLE_TYPE.HEATMAP),
  },
  {
    meta: {
      description: 'Heatmap style configuration.',
    },
  }
);

export const styleSchema = schema.oneOf([
  schema.object(
    {
      type: schema.string(),
    },
    {
      unknowns: 'allow',
    }
  ),
  EMSVectorTileStyleSchema,
  heatmapStyleSchema,
  vectorStyleSchema,
]);
