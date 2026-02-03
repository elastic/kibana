/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  DEFAULT_ICON,
  ICON_SOURCE,
  STYLE_TYPE,
  SYMBOLIZE_AS_TYPES,
} from '../../../../../../common/constants';
import { fieldMetaOptionsSchema } from './field_meta_options_schema';
import { styleFieldSchema } from './style_field_schema';

export const symbolizeAsOptions = schema.object({
  value: schema.maybe(
    schema.oneOf([
      schema.literal(SYMBOLIZE_AS_TYPES.CIRCLE),
      schema.literal(SYMBOLIZE_AS_TYPES.ICON),
    ])
  ),
});

export const symbolizeAsSchema = schema.object(
  {
    options: schema.object({
      value: schema.maybe(
        schema.oneOf([
          schema.literal(SYMBOLIZE_AS_TYPES.CIRCLE),
          schema.literal(SYMBOLIZE_AS_TYPES.ICON),
        ])
      ),
    }),
  },
  {
    defaultValue: {
      options: {
        value: SYMBOLIZE_AS_TYPES.CIRCLE,
      },
    },
    meta: {
      description: 'Configure to symbolize Point features as Circle markers or Icons',
    },
  }
);

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
  field: schema.maybe(styleFieldSchema),
  fieldMetaOptions: fieldMetaOptionsSchema,
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

export const iconSchema = schema.oneOf(
  [
    schema.object({
      type: schema.literal(STYLE_TYPE.STATIC),
      options: iconStaticOptions,
    }),
    schema.object({
      type: schema.literal(STYLE_TYPE.DYNAMIC),
      options: iconDynamicOptions,
    }),
  ],
  {
    defaultValue: {
      type: STYLE_TYPE.STATIC,
      options: {
        value: DEFAULT_ICON,
      },
    },
    meta: {
      description: 'Configure to set Point feature icon',
    },
  }
);

export const orientationDynamicOptions = schema.object({
  field: schema.maybe(styleFieldSchema),
  fieldMetaOptions: fieldMetaOptionsSchema,
});

export const orientationStaticOptions = schema.object({
  orientation: schema.number(),
});

export const orientationSchema = schema.oneOf(
  [
    schema.object({
      type: schema.literal(STYLE_TYPE.STATIC),
      options: orientationStaticOptions,
    }),
    schema.object({
      type: schema.literal(STYLE_TYPE.DYNAMIC),
      options: orientationDynamicOptions,
    }),
  ],
  {
    defaultValue: {
      type: STYLE_TYPE.STATIC,
      options: {
        orientation: 0,
      },
    },
    meta: {
      description:
        'Configure to rotate the icon clockwise. Ignored when Point features are symbolized as circle markers',
    },
  }
);

export const sizeDynamicOptions = schema.object({
  minSize: schema.number(),
  maxSize: schema.number(),
  field: schema.maybe(styleFieldSchema),
  fieldMetaOptions: fieldMetaOptionsSchema,
  invert: schema.maybe(schema.boolean()),
});

export const sizeStaticOptions = schema.object({
  size: schema.number(),
});

const sizeStaticSchema = schema.object({
  type: schema.literal(STYLE_TYPE.STATIC),
  options: sizeStaticOptions,
});

const sizeDynamiceSchema = schema.object({
  type: schema.literal(STYLE_TYPE.DYNAMIC),
  options: sizeDynamicOptions,
});
export const sizeSchema = schema.oneOf([sizeStaticSchema, sizeDynamiceSchema]);
export const lineWidthSchema = schema.oneOf([sizeStaticSchema, sizeDynamiceSchema], {
  defaultValue: {
    type: STYLE_TYPE.STATIC,
    options: {
      size: 1,
    },
  },
  meta: {
    description: 'Configure to set feature border width',
  },
});
export const iconSizeSchema = schema.oneOf([sizeStaticSchema, sizeDynamiceSchema], {
  defaultValue: {
    type: STYLE_TYPE.STATIC,
    options: {
      size: 6,
    },
  },
  meta: {
    description: 'Configure to set Point feature radius size in pixels',
  },
});
export const labelSizeSchema = schema.oneOf([sizeStaticSchema, sizeDynamiceSchema], {
  defaultValue: {
    type: STYLE_TYPE.STATIC,
    options: {
      size: 14,
    },
  },
  meta: {
    description: 'Configure to set label text size',
  },
});
