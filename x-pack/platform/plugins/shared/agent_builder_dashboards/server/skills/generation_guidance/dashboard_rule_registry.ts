/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardCompositionPrompt } from './design/composition';
import { dashboardControlsPrompt } from './design/controls';
import { gridLayoutPrompt } from './design/grid_layout';

export const dashboardRuleRegistry = {
  composition: {
    design: dashboardCompositionPrompt.trim(),
    review: [
      'Use topical sections for large or multi-topic dashboards, not decoration. Keep small single-topic dashboards flat. Move misplaced panels with update_panel_layouts, preserving their IDs; newSections/newSectionKey can group them in one operation.',
      'Consider avg/min/max legend.statistics on a primary time series when useful. Set them directly; do not change the query or require statistics on every dashboard.',
    ],
  },
  grid: {
    design: gridLayoutPrompt.trim(),
    review: [
      'Fix overlaps, inconsistent sizes, unreadable tables, and L-shaped holes. Inspect the whole dashboard, but change only affected rows and sections.',
      'Use equal sizes for comparable KPIs. A sparse final KPI row may leave trailing space; never stretch just its last metric. Tables should be at least 24 columns wide.',
    ],
  },
  controls: {
    design: dashboardControlsPrompt.trim(),
    review: [
      'Preserve existing controls and filters. Suggest a missing categorical control only when it improves navigation across actual entities; do not add controls merely to satisfy a quota.',
    ],
  },
} as const;
