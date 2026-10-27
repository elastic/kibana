/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BodyNode } from '../adaptive_nodes';
import type { AdaptiveChart } from '../model/adaptive_lens';

// The placeholder is a real `callout` node so the planner output validates
// today and renders as a useful "loading" affordance across every surface.
// The binder swaps these out for the bound chart/table/stat nodes.

interface PlaceholderArgs {
  title: string;
  chart: AdaptiveChart;
}

const chartKindLabel: Record<AdaptiveChart['kind'], string> = {
  xy: 'time series chart',
  metric: 'metric',
  partition: 'category breakdown',
  gauge: 'gauge',
  datatable: 'table',
  heatmap: 'heatmap',
};

/**
 * Build the loading-state node that lives in `plan.spec.body` until
 * `bindViewPlan` replaces it with a real bound primitive.
 */
export const buildPlaceholderNode = ({ title, chart }: PlaceholderArgs): BodyNode => ({
  type: 'callout',
  tone: 'neutral',
  title,
  body: `Loading ${chartKindLabel[chart.kind]}...`,
});
