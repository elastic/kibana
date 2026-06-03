/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { VECTOR_STYLES } from '../../../../../../common';
import { LAYER_STYLE_TYPE } from '../../../../../../common/constants';
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

export const vectorStylePropertiesSchema = schema.object({
  [VECTOR_STYLES.SYMBOLIZE_AS]: schema.maybe(symbolizeAsSchema),
  [VECTOR_STYLES.FILL_COLOR]: schema.maybe(fillColorSchema),
  [VECTOR_STYLES.LINE_COLOR]: schema.maybe(lineColorSchema),
  [VECTOR_STYLES.LINE_WIDTH]: schema.maybe(lineWidthSchema),
  [VECTOR_STYLES.ICON]: schema.maybe(iconSchema),
  [VECTOR_STYLES.ICON_SIZE]: schema.maybe(iconSizeSchema),
  [VECTOR_STYLES.ICON_ORIENTATION]: schema.maybe(orientationSchema),
  [VECTOR_STYLES.LABEL_TEXT]: schema.maybe(labelSchema),
  [VECTOR_STYLES.LABEL_ZOOM_RANGE]: schema.maybe(labelZoomRangeSchema),
  [VECTOR_STYLES.LABEL_COLOR]: schema.maybe(labelColorSchema),
  [VECTOR_STYLES.LABEL_SIZE]: schema.maybe(labelSizeSchema),
  [VECTOR_STYLES.LABEL_BORDER_COLOR]: schema.maybe(labelBorderColorSchema),
  [VECTOR_STYLES.LABEL_BORDER_SIZE]: schema.maybe(labelBorderSizeSchema),
  [VECTOR_STYLES.LABEL_POSITION]: schema.maybe(labelPositionSchema),
});

export const vectorStyleSchema = schema.object({
  properties: vectorStylePropertiesSchema,
  isTimeAware: schema.maybe(
    schema.boolean({
      defaultValue: true,
      meta: {
        description:
          'Set to true to apply global time to style metadata requests. When set to true, style metadata will be re-fetched when global time changes.',
      },
    })
  ),
  type: schema.literal(LAYER_STYLE_TYPE.VECTOR),
});
