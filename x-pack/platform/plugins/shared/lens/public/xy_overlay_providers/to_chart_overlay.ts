/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XYOverlay } from '@kbn/expression-xy-plugin/common';
import type { LensXYOverlay } from '@kbn/lens-common';

/**
 * Maps a Lens overlay to the chart's own overlay type.
 * The chart keeps a separate copy of the type, so every field is mapped explicitly: update both when either changes.
 */
export const toChartOverlay = ({
  type,
  providerId,
  layerId,
  title,
  data,
  xAccessor,
  yAccessor,
}: LensXYOverlay): XYOverlay => ({
  type,
  id: providerId,
  layerId,
  title,
  data,
  xAccessor,
  yAccessor,
});
