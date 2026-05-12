/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  LABEL_BORDER_SIZES,
  LABEL_POSITIONS,
  MAX_ZOOM,
  MIN_ZOOM,
  STYLE_TYPE,
} from '../../../../../../common/constants';
import { styleFieldSchema } from './style_field_schema';

export const labelBorderSizeOptions = schema.object({
  size: schema.oneOf([
    schema.literal(LABEL_BORDER_SIZES.NONE),
    schema.literal(LABEL_BORDER_SIZES.SMALL),
    schema.literal(LABEL_BORDER_SIZES.MEDIUM),
    schema.literal(LABEL_BORDER_SIZES.LARGE),
  ]),
});

export const labelBorderSizeSchema = schema.object(
  {
    options: labelBorderSizeOptions,
  },
  {
    defaultValue: {
      options: {
        size: LABEL_BORDER_SIZES.SMALL,
      },
    },
    meta: {
      description: 'Configure to set label border width',
    },
  }
);

export const labelPositionSchema = schema.object(
  {
    options: schema.object({
      position: schema.oneOf([
        schema.literal(LABEL_POSITIONS.BOTTOM),
        schema.literal(LABEL_POSITIONS.CENTER),
        schema.literal(LABEL_POSITIONS.TOP),
      ]),
    }),
  },
  {
    defaultValue: {
      options: {
        position: LABEL_POSITIONS.CENTER,
      },
    },
    meta: {
      description: 'Configure to place label above, in the center of, or below the Point feature',
    },
  }
);

export const labelZoomRangeSchema = schema.object(
  {
    options: schema.object({
      useLayerZoomRange: schema.boolean(),
      minZoom: schema.number(),
      maxZoom: schema.number(),
    }),
  },
  {
    defaultValue: {
      options: {
        useLayerZoomRange: true,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
      },
    },
    meta: {
      description: 'Configure to set the zoom range for which labels are displayed',
    },
  }
);

export const labelDynamicOptions = schema.object({
  field: schema.maybe(styleFieldSchema),
});

export const labelStaticOptions = schema.object({
  value: schema.string({
    meta: {
      description: 'Provided value displayed as feature label',
    },
  }),
});

export const labelSchema = schema.oneOf(
  [
    schema.object({
      type: schema.literal(STYLE_TYPE.STATIC),
      options: labelStaticOptions,
    }),
    schema.object({
      type: schema.literal(STYLE_TYPE.DYNAMIC),
      options: labelDynamicOptions,
    }),
  ],
  {
    defaultValue: {
      type: STYLE_TYPE.STATIC,
      options: {
        value: '',
      },
    },
    meta: {
      description: 'Configure to set label content',
    },
  }
);
