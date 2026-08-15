/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAYER_STYLE_TYPE } from '../constants';
import type { HeatmapStyleDescriptor } from '../descriptor_types';

type HeatmapColorRampName = NonNullable<HeatmapStyleDescriptor['colorRampName']>;

export function createHeatmapStyleDescriptor(
  colorRampName: HeatmapColorRampName
): Required<HeatmapStyleDescriptor> {
  return {
    type: LAYER_STYLE_TYPE.HEATMAP,
    colorRampName,
  };
}
