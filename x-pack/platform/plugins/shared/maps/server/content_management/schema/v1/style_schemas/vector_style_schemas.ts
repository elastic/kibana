/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SYMBOLIZE_AS_TYPES, VECTOR_STYLES } from '../../../../../common';
import { FIELD_ORIGIN } from '../../../../../common/constants';
import { colorStylePropertySchema } from './color_schemas';

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
  [VECTOR_STYLES.FILL_COLOR]: colorStylePropertySchema,
  [VECTOR_STYLES.LINE_COLOR]: colorStylePropertySchema,
});
/* export type VectorStylePropertiesDescriptor = {
  [VECTOR_STYLES.LINE_WIDTH]: SizeStylePropertyDescriptor;
  [VECTOR_STYLES.ICON]: IconStylePropertyDescriptor;
  [VECTOR_STYLES.ICON_SIZE]: SizeStylePropertyDescriptor;
  [VECTOR_STYLES.ICON_ORIENTATION]: OrientationStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_TEXT]: LabelStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_ZOOM_RANGE]: LabelZoomRangeStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_COLOR]: ColorStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_SIZE]: SizeStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_BORDER_COLOR]: ColorStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_BORDER_SIZE]: LabelBorderSizeStylePropertyDescriptor;
  [VECTOR_STYLES.LABEL_POSITION]: LabelPositionStylePropertyDescriptor;
};*/
