/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ICON_SOURCE, STYLE_TYPE, SYMBOLIZE_AS_TYPES } from '../../../../../common/constants';
import { fieldMetaOptions, styleField } from './vector_style_schemas';

export const symbolizeAsOptionsSchema = schema.object({
  value: schema.maybe(
    schema.oneOf([
      schema.literal(SYMBOLIZE_AS_TYPES.CIRCLE),
      schema.literal(SYMBOLIZE_AS_TYPES.ICON),
    ])
  ),
});

export const symbolizeAsStylePropertySchema = schema.object({
  options: symbolizeAsOptionsSchema,
});

const iconSource = schema.maybe(
  schema.oneOf([schema.literal(ICON_SOURCE.CUSTOM), schema.literal(ICON_SOURCE.MAKI)])
);

export const iconStop = schema.object({
  stop: schema.nullable(schema.string()),
  icon: schema.string(),
  iconSource,
});

export const iconDynamicOptions = schema.object({
  iconPaletteId: schema.nullable(schema.string()),
  customIconStops: schema.maybe(schema.arrayOf(iconStop)),
  useCustomIconMap: schema.maybe(schema.boolean()),
  field: schema.maybe(styleField),
  fieldMetaOptions,
});

export const iconStaticOptions = schema.object({
  value: schema.string({
    meta: {
      description: 'icon id',
    },
  }),
  label: schema.maybe(schema.string()),
  svg: schema.maybe(schema.string()),
  iconSource: schema.maybe(iconSource),
});

export const iconSchema = schema.oneOf([
  schema.object({
    type: schema.literal(STYLE_TYPE.STATIC),
    options: iconStaticOptions,
  }),
  schema.object({
    type: schema.literal(STYLE_TYPE.DYNAMIC),
    options: iconDynamicOptions,
  }),
]);

export const orientationDynamicOptions = schema.object({
  field: schema.maybe(styleField),
  fieldMetaOptions,
});

export const orientationStaticOptions = schema.object({
  orientation: schema.number(),
});

export const orientationSchema = schema.oneOf([
  schema.object({
    type: schema.literal(STYLE_TYPE.STATIC),
    options: orientationStaticOptions,
  }),
  schema.object({
    type: schema.literal(STYLE_TYPE.DYNAMIC),
    options: orientationDynamicOptions,
  }),
]);

export const sizeDynamicOptions = schema.object({
  minSize: schema.number(),
  maxSize: schema.number(),
  field: schema.maybe(styleField),
  fieldMetaOptions,
  invert: schema.maybe(schema.boolean()),
});

export const sizeStaticOptions = schema.object({
  size: schema.number(),
});

export const sizeSchema = schema.oneOf([
  schema.object({
    type: schema.literal(STYLE_TYPE.STATIC),
    options: sizeStaticOptions,
  }),
  schema.object({
    type: schema.literal(STYLE_TYPE.DYNAMIC),
    options: sizeDynamicOptions,
  }),
]);
