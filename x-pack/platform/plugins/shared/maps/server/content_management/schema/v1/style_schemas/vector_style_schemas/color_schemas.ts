/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  COLOR_MAP_TYPE,
  DATA_MAPPING_FUNCTION,
  STYLE_TYPE,
} from '../../../../../../common/constants';
import { fieldMetaOptionsSchema } from './field_meta_options_schema';
import { styleFieldSchema } from './style_field_schema';

export const categoryColorStop = schema.object({
  stop: schema.nullable(schema.string()),
  color: schema.string(),
});

export const ordinalColorStop = schema.object({
  stop: schema.number(),
  color: schema.string(),
});

export const colorDynamicOptions = schema.object({
  // ordinal color properties
  color: schema.maybe(schema.string()),
  customColorRamp: schema.maybe(schema.arrayOf(ordinalColorStop)),
  useCustomColorRamp: schema.maybe(schema.boolean()),
  dataMappingFunction: schema.maybe(
    schema.oneOf([
      schema.literal(DATA_MAPPING_FUNCTION.INTERPOLATE),
      schema.literal(DATA_MAPPING_FUNCTION.PERCENTILES),
    ])
  ),
  invert: schema.maybe(schema.boolean()),

  // category color properties
  colorCategory: schema.maybe(schema.string()),
  customColorPalette: schema.maybe(schema.arrayOf(categoryColorStop)),
  useCustomColorPalette: schema.maybe(schema.boolean()),
  otherCategoryColor: schema.maybe(schema.string()),

  field: schema.maybe(styleFieldSchema),
  fieldMetaOptions: fieldMetaOptionsSchema,

  type: schema.maybe(
    schema.oneOf([
      schema.literal(COLOR_MAP_TYPE.CATEGORICAL),
      schema.literal(COLOR_MAP_TYPE.ORDINAL),
    ])
  ),
});

export const colorStaticOptions = schema.object({
  color: schema.string(),
});

export const colorStaticSchema = schema.object({
  type: schema.literal(STYLE_TYPE.STATIC),
  options: colorStaticOptions,
});

export const colorDynamicSchema = schema.object({
  type: schema.literal(STYLE_TYPE.DYNAMIC),
  options: colorDynamicOptions,
});

export const colorSchema = schema.oneOf([colorStaticSchema, colorDynamicSchema]);
export const fillColorSchema = schema.oneOf([colorStaticSchema, colorDynamicSchema], {
  defaultValue: {
    type: STYLE_TYPE.STATIC,
    options: {
      color: '#16C5C0',
    },
  },
  meta: {
    description:
      'Configure to set feature filled color. Line features do not have filled area and are not effected by this configuration.',
  },
});
export const lineColorSchema = schema.oneOf([colorStaticSchema, colorDynamicSchema], {
  defaultValue: {
    type: STYLE_TYPE.STATIC,
    options: {
      color: '#16C5C0',
    },
  },
  meta: {
    description: 'Configure to set feature border color. Ignored when border size is 0',
  },
});
export const labelColorSchema = schema.oneOf([colorStaticSchema, colorDynamicSchema], {
  defaultValue: {
    type: STYLE_TYPE.STATIC,
    options: {
      color: '#000000',
    },
  },
  meta: {
    description: 'Configure to set label text color',
  },
});
export const labelBorderColorSchema = schema.oneOf([colorStaticSchema, colorDynamicSchema], {
  defaultValue: {
    type: STYLE_TYPE.STATIC,
    options: {
      color: '#FFFFFF',
    },
  },
  meta: {
    description: 'Configure to set label border color',
  },
});
