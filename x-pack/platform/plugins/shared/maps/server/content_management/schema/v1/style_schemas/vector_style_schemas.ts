/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { VECTOR_STYLES } from '../../../../../common';
import { FIELD_ORIGIN } from '../../../../../common/constants';
import { colorSchema } from './color_schemas';
import {
  labelBorderSizeSchema,
  labelPositionSchema,
  labelSchema,
  labelZoomRangeSchema,
} from './label_schemas';
import {
  iconSchema,
  orientationSchema,
  sizeSchema,
  symbolizeAsStylePropertySchema,
} from './marker_schemas';

export const fieldMetaSchema = schema.object({
  isEnabled: schema.boolean(),
  sigma: schema.maybe(schema.number()),
  percentiles: schema.maybe(schema.arrayOf(schema.number())),
});

export const styleField = schema.object({
  name: schema.string(),
  origin: schema.oneOf([schema.literal(FIELD_ORIGIN.SOURCE), schema.literal(FIELD_ORIGIN.JOIN)]),
});

export const vectorStylePropertiesSchema = schema.object({
  [VECTOR_STYLES.SYMBOLIZE_AS]: schema.maybe(symbolizeAsStylePropertySchema),
  [VECTOR_STYLES.FILL_COLOR]: colorSchema,
  [VECTOR_STYLES.LINE_COLOR]: colorSchema,
  [VECTOR_STYLES.LINE_WIDTH]: sizeSchema,
  [VECTOR_STYLES.ICON]: iconSchema,
  [VECTOR_STYLES.ICON_SIZE]: sizeSchema,
  [VECTOR_STYLES.ICON_ORIENTATION]: orientationSchema,
  [VECTOR_STYLES.LABEL_TEXT]: labelSchema,
  [VECTOR_STYLES.LABEL_ZOOM_RANGE]: labelZoomRangeSchema,
  [VECTOR_STYLES.LABEL_COLOR]: colorSchema,
  [VECTOR_STYLES.LABEL_SIZE]: sizeSchema,
  [VECTOR_STYLES.LABEL_BORDER_COLOR]: colorSchema,
  [VECTOR_STYLES.LABEL_BORDER_SIZE]: labelBorderSizeSchema,
  [VECTOR_STYLES.LABEL_POSITION]: labelPositionSchema,
});
