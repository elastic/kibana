/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { VECTOR_STYLES } from '../../../../../../common';
import { FIELD_ORIGIN, LAYER_STYLE_TYPE } from '../../../../../../common/constants';
import {
  labelBorderColorSchema,
  fillColorSchema,
  labelColorSchema,
  lineColorSchema,
} from './color_schemas';
import {
  labelBorderSizeSchema,
  labelPositionSchema,
  labelSchema,
  labelZoomRangeSchema,
} from './label_schemas';
import {
  iconSchema,
  iconSizeSchema,
  labelSizeSchema,
  lineWidthSchema,
  orientationSchema,
  symbolizeAsSchema,
} from './marker_schemas';

export const fieldMetaOptions = schema.object({
  isEnabled: schema.boolean(),
  sigma: schema.maybe(schema.number()),
  percentiles: schema.maybe(schema.arrayOf(schema.number())),
});

export const styleField = schema.object({
  name: schema.string(),
  origin: schema.oneOf([schema.literal(FIELD_ORIGIN.SOURCE), schema.literal(FIELD_ORIGIN.JOIN)]),
});

export const vectorStylePropertiesSchema = schema.object({
  [VECTOR_STYLES.SYMBOLIZE_AS]: schema.maybe(symbolizeAsSchema),
  [VECTOR_STYLES.FILL_COLOR]: fillColorSchema,
  [VECTOR_STYLES.LINE_COLOR]: lineColorSchema,
  [VECTOR_STYLES.LINE_WIDTH]: lineWidthSchema,
  [VECTOR_STYLES.ICON]: iconSchema,
  [VECTOR_STYLES.ICON_SIZE]: iconSizeSchema,
  [VECTOR_STYLES.ICON_ORIENTATION]: orientationSchema,
  [VECTOR_STYLES.LABEL_TEXT]: labelSchema,
  [VECTOR_STYLES.LABEL_ZOOM_RANGE]: labelZoomRangeSchema,
  [VECTOR_STYLES.LABEL_COLOR]: labelColorSchema,
  [VECTOR_STYLES.LABEL_SIZE]: labelSizeSchema,
  [VECTOR_STYLES.LABEL_BORDER_COLOR]: labelBorderColorSchema,
  [VECTOR_STYLES.LABEL_BORDER_SIZE]: labelBorderSizeSchema,
  [VECTOR_STYLES.LABEL_POSITION]: labelPositionSchema,
});

export const vectorStyleSchema = schema.object({
  properties: vectorStylePropertiesSchema,
  isTimeAware: schema.boolean(),
  type: schema.literal(LAYER_STYLE_TYPE.VECTOR),
});
