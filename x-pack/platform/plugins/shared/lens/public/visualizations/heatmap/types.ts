/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeatmapArguments } from '@kbn/expression-heatmap-plugin/common';
import type { HeatmapChartShapes, LensLayerType } from '@kbn/visualizations-plugin/common';

export type HeatmapLayerState = Omit<HeatmapArguments, 'palette'> & {
  layerId: string;
  layerType: LensLayerType;
  valueAccessor?: string;
  xAccessor?: string;
  yAccessor?: string;
  shape: HeatmapChartShapes;
};
