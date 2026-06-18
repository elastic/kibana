/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  LABEL_BORDER_SIZES,
  LABEL_POSITIONS,
  MAX_ZOOM,
  MIN_ZOOM,
  STYLE_TYPE,
} from '../../../../../../common/constants';
import { styleFieldSchema } from './style_field_schema';

export const labelBorderSizeOptions = z
  .object({
    size: z.union([
      z.literal(LABEL_BORDER_SIZES.NONE),
      z.literal(LABEL_BORDER_SIZES.SMALL),
      z.literal(LABEL_BORDER_SIZES.MEDIUM),
      z.literal(LABEL_BORDER_SIZES.LARGE),
    ]),
  })
  .strict();

export const labelBorderSizeSchema = z
  .object({
    options: labelBorderSizeOptions,
  })
  .strict()
  .default({
    options: {
      size: LABEL_BORDER_SIZES.SMALL,
    },
  })
  .meta({
    description: 'Configure to set label border width',
  });

export const labelPositionSchema = z
  .object({
    options: z
      .object({
        position: z.union([
          z.literal(LABEL_POSITIONS.BOTTOM),
          z.literal(LABEL_POSITIONS.CENTER),
          z.literal(LABEL_POSITIONS.TOP),
        ]),
      })
      .strict(),
  })
  .strict()
  .default({
    options: {
      position: LABEL_POSITIONS.CENTER,
    },
  })
  .meta({
    description: 'Configure to place label above, in the center of, or below the Point feature',
  });

export const labelZoomRangeSchema = z
  .object({
    options: z
      .object({
        useLayerZoomRange: z.boolean(),
        minZoom: z.number(),
        maxZoom: z.number(),
      })
      .strict(),
  })
  .strict()
  .default({
    options: {
      useLayerZoomRange: true,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    },
  })
  .meta({
    description: 'Configure to set the zoom range for which labels are displayed',
  });

export const labelDynamicOptions = z
  .object({
    field: styleFieldSchema.optional(),
  })
  .strict();

export const labelStaticOptions = z
  .object({
    value: z.string().meta({
      description: 'Provided value displayed as feature label',
    }),
  })
  .strict();

export const labelSchema = z
  .union([
    z
      .object({
        type: z.literal(STYLE_TYPE.STATIC),
        options: labelStaticOptions,
      })
      .strict(),
    z
      .object({
        type: z.literal(STYLE_TYPE.DYNAMIC),
        options: labelDynamicOptions,
      })
      .strict(),
  ])
  .default({
    type: STYLE_TYPE.STATIC,
    options: {
      value: '',
    },
  })
  .meta({
    description: 'Configure to set label content',
  });
