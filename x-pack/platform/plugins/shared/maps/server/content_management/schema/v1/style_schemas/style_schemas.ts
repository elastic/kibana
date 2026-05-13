/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { LAYER_STYLE_TYPE } from '../../../../../common/constants';
import { vectorStyleSchema } from './vector_style_schemas/vector_style_schemas';

export const EMSVectorTileStyleSchema = z
  .object({
    color: z.string(),
    type: z.literal(LAYER_STYLE_TYPE.EMS_VECTOR_TILE),
  })
  .meta({
    description: 'Elastic Maps Service (EMS) Vector Tile style configuration.',
  });

export const heatmapStyleSchema = z
  .object({
    colorRampName: z
      .union([
        z.literal('Blues'),
        z.literal('Greens'),
        z.literal('Greys'),
        z.literal('Reds'),
        z.literal('Yellow to Red'),
        z.literal('Green to Red'),
        z.literal('Blue to Red'),
        z.literal('theclassic'),
      ])
      .default('theclassic')
      .optional(),
    type: z.literal(LAYER_STYLE_TYPE.HEATMAP),
  })
  .meta({
    description: 'Heatmap style configuration.',
  });

export const styleSchema = z.union([
  z
    .object({
      type: z.string(),
    })
    .loose(),
  EMSVectorTileStyleSchema,
  heatmapStyleSchema,
  vectorStyleSchema,
]);
