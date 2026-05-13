/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
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

export const vectorStylePropertiesSchema = z.object({
  [VECTOR_STYLES.SYMBOLIZE_AS]: symbolizeAsSchema.optional(),
  [VECTOR_STYLES.FILL_COLOR]: fillColorSchema.optional(),
  [VECTOR_STYLES.LINE_COLOR]: lineColorSchema.optional(),
  [VECTOR_STYLES.LINE_WIDTH]: lineWidthSchema.optional(),
  [VECTOR_STYLES.ICON]: iconSchema.optional(),
  [VECTOR_STYLES.ICON_SIZE]: iconSizeSchema.optional(),
  [VECTOR_STYLES.ICON_ORIENTATION]: orientationSchema.optional(),
  [VECTOR_STYLES.LABEL_TEXT]: labelSchema.optional(),
  [VECTOR_STYLES.LABEL_ZOOM_RANGE]: labelZoomRangeSchema.optional(),
  [VECTOR_STYLES.LABEL_COLOR]: labelColorSchema.optional(),
  [VECTOR_STYLES.LABEL_SIZE]: labelSizeSchema.optional(),
  [VECTOR_STYLES.LABEL_BORDER_COLOR]: labelBorderColorSchema.optional(),
  [VECTOR_STYLES.LABEL_BORDER_SIZE]: labelBorderSizeSchema.optional(),
  [VECTOR_STYLES.LABEL_POSITION]: labelPositionSchema.optional(),
});

export const vectorStyleSchema = z.object({
  properties: vectorStylePropertiesSchema,
  isTimeAware: z.boolean().default(true).optional().meta({
    description:
      'Set to true to apply global time to style metadata requests. When set to true, style metadata will be re-fetched when global time changes.',
  }),
  type: z.literal(LAYER_STYLE_TYPE.VECTOR),
});
