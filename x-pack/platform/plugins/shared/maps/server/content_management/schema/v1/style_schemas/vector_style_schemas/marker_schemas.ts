/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  DEFAULT_ICON,
  ICON_SOURCE,
  STYLE_TYPE,
  SYMBOLIZE_AS_TYPES,
} from '../../../../../../common/constants';
import { fieldMetaOptionsSchema } from './field_meta_options_schema';
import { styleFieldSchema } from './style_field_schema';

export const symbolizeAsOptions = z.object({
  value: z
    .union([z.literal(SYMBOLIZE_AS_TYPES.CIRCLE), z.literal(SYMBOLIZE_AS_TYPES.ICON)])
    .optional(),
});

export const symbolizeAsSchema = z
  .object({
    options: z.object({
      value: z
        .union([z.literal(SYMBOLIZE_AS_TYPES.CIRCLE), z.literal(SYMBOLIZE_AS_TYPES.ICON)])
        .optional(),
    }),
  })
  .default({
    options: {
      value: SYMBOLIZE_AS_TYPES.CIRCLE,
    },
  })
  .meta({
    description: 'Configure to symbolize Point features as Circle markers or Icons',
  });

const iconSource = z.union([z.literal(ICON_SOURCE.CUSTOM), z.literal(ICON_SOURCE.MAKI)]).optional();

export const iconStop = z.object({
  stop: z.string().nullable(),
  icon: z.string(),
  iconSource,
});

export const iconDynamicOptions = z.object({
  iconPaletteId: z.string().nullable(),
  customIconStops: z.array(iconStop).optional(),
  useCustomIconMap: z.boolean().optional(),
  field: styleFieldSchema.optional(),
  fieldMetaOptions: fieldMetaOptionsSchema,
});

export const iconStaticOptions = z.object({
  value: z.string().meta({
    description: 'icon id',
  }),
  label: z.string().optional(),
  svg: z.string().optional(),
  iconSource: iconSource.optional(),
});

export const iconSchema = z
  .union([
    z.object({
      type: z.literal(STYLE_TYPE.STATIC),
      options: iconStaticOptions,
    }),
    z.object({
      type: z.literal(STYLE_TYPE.DYNAMIC),
      options: iconDynamicOptions,
    }),
  ])
  .default({
    type: STYLE_TYPE.STATIC,
    options: {
      value: DEFAULT_ICON,
    },
  })
  .meta({
    description: 'Configure to set Point feature icon',
  });

export const orientationDynamicOptions = z.object({
  field: styleFieldSchema.optional(),
  fieldMetaOptions: fieldMetaOptionsSchema,
});

export const orientationStaticOptions = z.object({
  orientation: z.number(),
});

export const orientationSchema = z
  .union([
    z.object({
      type: z.literal(STYLE_TYPE.STATIC),
      options: orientationStaticOptions,
    }),
    z.object({
      type: z.literal(STYLE_TYPE.DYNAMIC),
      options: orientationDynamicOptions,
    }),
  ])
  .default({
    type: STYLE_TYPE.STATIC,
    options: {
      orientation: 0,
    },
  })
  .meta({
    description:
      'Configure to rotate the icon clockwise. Ignored when Point features are symbolized as circle markers',
  });

export const sizeDynamicOptions = z.object({
  minSize: z.number(),
  maxSize: z.number(),
  field: styleFieldSchema.optional(),
  fieldMetaOptions: fieldMetaOptionsSchema,
  invert: z.boolean().optional(),
});

export const sizeStaticOptions = z.object({
  size: z.number(),
});

const sizeStaticSchema = z.object({
  type: z.literal(STYLE_TYPE.STATIC),
  options: sizeStaticOptions,
});

const sizeDynamiceSchema = z.object({
  type: z.literal(STYLE_TYPE.DYNAMIC),
  options: sizeDynamicOptions,
});
export const sizeSchema = z.union([sizeStaticSchema, sizeDynamiceSchema]);
export const lineWidthSchema = z
  .union([sizeStaticSchema, sizeDynamiceSchema])
  .default({
    type: STYLE_TYPE.STATIC,
    options: {
      size: 1,
    },
  })
  .meta({
    description: 'Configure to set feature border width',
  });
export const iconSizeSchema = z
  .union([sizeStaticSchema, sizeDynamiceSchema])
  .default({
    type: STYLE_TYPE.STATIC,
    options: {
      size: 6,
    },
  })
  .meta({
    description: 'Configure to set Point feature radius size in pixels',
  });
export const labelSizeSchema = z
  .union([sizeStaticSchema, sizeDynamiceSchema])
  .default({
    type: STYLE_TYPE.STATIC,
    options: {
      size: 14,
    },
  })
  .meta({
    description: 'Configure to set label text size',
  });
