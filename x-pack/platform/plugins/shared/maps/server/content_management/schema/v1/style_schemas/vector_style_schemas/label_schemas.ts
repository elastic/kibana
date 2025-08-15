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
  STYLE_TYPE,
} from '../../../../../../common/constants';
import { styleField } from './vector_style_schemas';

export const labelBorderSizeOptions = schema.object({
  size: schema.oneOf([
    schema.literal(LABEL_BORDER_SIZES.NONE),
    schema.literal(LABEL_BORDER_SIZES.SMALL),
    schema.literal(LABEL_BORDER_SIZES.MEDIUM),
    schema.literal(LABEL_BORDER_SIZES.LARGE),
  ]),
});

export const labelBorderSizeSchema = schema.object({
  options: labelBorderSizeOptions,
});

export const labelPositionSchema = schema.object({
  options: schema.object({
    position: schema.oneOf([
      schema.literal(LABEL_POSITIONS.BOTTOM),
      schema.literal(LABEL_POSITIONS.CENTER),
      schema.literal(LABEL_POSITIONS.TOP),
    ]),
  }),
});

export const labelZoomRangeSchema = schema.object({
  options: schema.object({
    useLayerZoomRange: schema.boolean(),
    minZoom: schema.number(),
    maxZoom: schema.number(),
  }),
});

export const labelDynamicOptions = schema.object({
  field: schema.maybe(styleField),
});

export const labelStaticOptions = schema.object({
  value: schema.string({
    meta: {
      description: 'Provided value displayed as feature label',
    },
  }),
});

export const labelSchema = schema.oneOf([
  schema.object({
    type: schema.literal(STYLE_TYPE.STATIC),
    options: labelStaticOptions,
  }),
  schema.object({
    type: schema.literal(STYLE_TYPE.DYNAMIC),
    options: labelDynamicOptions,
  }),
]);
