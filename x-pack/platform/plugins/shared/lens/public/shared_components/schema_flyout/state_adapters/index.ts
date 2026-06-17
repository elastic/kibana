/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { datatableStateAdapter } from './datatable';
import { heatmapStateAdapter } from './heatmap';
import { xyStateAdapter } from './xy';
import { partitionStateAdapter } from './partition';
import { metricStateAdapter } from './metric';
import { gaugeStateAdapter } from './gauge';
import { tagcloudStateAdapter } from './tagcloud';
import type { VizStateAdapter } from './types';

const adapters: Record<string, VizStateAdapter> = {
  lnsDatatable: datatableStateAdapter,
  lnsHeatmap: heatmapStateAdapter,
  lnsXY: xyStateAdapter,
  lnsPie: partitionStateAdapter,
  lnsMetric: metricStateAdapter,
  lnsGauge: gaugeStateAdapter,
  lnsTagcloud: tagcloudStateAdapter,
};

export const getStateAdapter = (vizId: string): VizStateAdapter | undefined => adapters[vizId];

export type { VizStateAdapter } from './types';
