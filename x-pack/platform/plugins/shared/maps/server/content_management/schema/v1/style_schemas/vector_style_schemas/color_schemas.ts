/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  COLOR_MAP_TYPE,
  DATA_MAPPING_FUNCTION,
  STYLE_TYPE,
} from '../../../../../../common/constants';
import { fieldMetaOptionsSchema } from './field_meta_options_schema';
import { styleFieldSchema } from './style_field_schema';

export const categoryColorStop = z
  .object({
    stop: z.string().nullable().default(null),
    color: z.string(),
  })
  .strict();

export const ordinalColorStop = z
  .object({
    stop: z.number(),
    color: z.string(),
  })
  .strict();

export const colorDynamicOptions = z
  .object({
    // ordinal color properties
    color: z.string().optional(),
    customColorRamp: z.array(ordinalColorStop).optional(),
    useCustomColorRamp: z.boolean().optional(),
    dataMappingFunction: z
      .union([
        z.literal(DATA_MAPPING_FUNCTION.INTERPOLATE),
        z.literal(DATA_MAPPING_FUNCTION.PERCENTILES),
      ])
      .optional(),
    invert: z.boolean().optional(),

    // category color properties
    colorCategory: z.string().optional(),
    customColorPalette: z.array(categoryColorStop).optional(),
    useCustomColorPalette: z.boolean().optional(),
    otherCategoryColor: z.string().optional(),

    field: styleFieldSchema.optional(),
    fieldMetaOptions: fieldMetaOptionsSchema,

    type: z
      .union([z.literal(COLOR_MAP_TYPE.CATEGORICAL), z.literal(COLOR_MAP_TYPE.ORDINAL)])
      .optional(),
  })
  .strict();

export const colorStaticOptions = z
  .object({
    color: z.string(),
  })
  .strict();

export const colorStaticSchema = z
  .object({
    type: z.literal(STYLE_TYPE.STATIC),
    options: colorStaticOptions,
  })
  .strict();

export const colorDynamicSchema = z
  .object({
    type: z.literal(STYLE_TYPE.DYNAMIC),
    options: colorDynamicOptions,
  })
  .strict();

export const colorSchema = z.union([colorStaticSchema, colorDynamicSchema]);
export const fillColorSchema = z
  .union([colorStaticSchema, colorDynamicSchema])
  .default({
    type: STYLE_TYPE.STATIC,
    options: {
      color: '#16C5C0',
    },
  })
  .meta({
    description:
      'Configure to set feature filled color. Line features do not have filled area and are not effected by this configuration.',
  });
export const lineColorSchema = z
  .union([colorStaticSchema, colorDynamicSchema])
  .default({
    type: STYLE_TYPE.STATIC,
    options: {
      color: '#16C5C0',
    },
  })
  .meta({
    description: 'Configure to set feature border color. Ignored when border size is 0',
  });
export const labelColorSchema = z
  .union([colorStaticSchema, colorDynamicSchema])
  .default({
    type: STYLE_TYPE.STATIC,
    options: {
      color: '#000000',
    },
  })
  .meta({
    description: 'Configure to set label text color',
  });
export const labelBorderColorSchema = z
  .union([colorStaticSchema, colorDynamicSchema])
  .default({
    type: STYLE_TYPE.STATIC,
    options: {
      color: '#FFFFFF',
    },
  })
  .meta({
    description: 'Configure to set label border color',
  });
