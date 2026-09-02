/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardCompositionPrompt } from './design/composition';
import { dashboardControlsPrompt } from './design/controls';
import { gridLayoutPrompt } from './design/grid_layout';

/**
 * Dashboard-level prompt topics. Same shape as the chart-type registry:
 * `config.rules` is design HOW (skill body only); `review.critical` /
 * `review.suggestions` are compiled only into the review prompt — do not
 * restate `config.rules`.
 */
export interface DashboardRuleEntry {
  prompt: {
    review?: {
      /**
       * Painted violations and judge exceptions. Name the failure; do not
       * repeat the sizing table or other HOW from `config.rules`.
       */
      critical?: string[];
      /**
       * Weaker painted prompts. Omit anything already covered by `config.rules`.
       */
      suggestions?: string[];
    };
    config?: {
      rules?: string[];
    };
  };
}

export const dashboardRuleTopics = {
  composition: 'composition',
  grid: 'grid',
  controls: 'controls',
} as const;

export type DashboardRuleTopic = (typeof dashboardRuleTopics)[keyof typeof dashboardRuleTopics];

export type DashboardRuleRegistry = Record<DashboardRuleTopic, DashboardRuleEntry>;

export const dashboardRuleRegistry: DashboardRuleRegistry = {
  [dashboardRuleTopics.composition]: {
    prompt: {
      review: {
        critical: [
          'Sections used only for decoration, with no topical grouping, are a critical issue.',
          'A dashboard with about 6 or more visualization panels, or with distinct topics such as overview KPIs, trends, and breakdowns, that has no topical sections is a critical issue. Wrap those panels in named sections with `update_panel_layouts` (`newSections` + `newSectionKey`). A small single-topic dashboard that scans as one sequence is not this issue. If topical sections already group the panels, this is not an issue.',
          'A panel in the wrong topical section is a critical issue — for example a KPI at top-level or in Trends/Breakdowns when an Overview/Key Metrics section exists, or a time-series among KPIs. Put it in the right section with `update_panel_layouts` (`newSectionKey` or `sectionId`).',
          'Key Metrics / Overview must be KPI-only. A table or time series in that section is a critical issue — move it out. Do not invent a mixed-role section.',
          'A piecemeal layout is a critical issue — resizing a couple of panels and leaving gaps or misplaced panels. Review grid positions and composition together; if anything violates, rethink where panels live.',
          'A dashboard that has time-series XY panels but none with legend statistics (avg/min/max) is a critical issue. Add them on one primary overview trend (at most two). The edit query MUST include the exact phrase "show avg/min/max in the legend" (e.g. "log volume over time, show avg/min/max in the legend"). Skip categorical bars and queries whose measure is already AVG/MIN/MAX of a field. If at least one already has them, this is not an issue.',
        ],
      },
      config: {
        rules: [dashboardCompositionPrompt.trim()],
      },
    },
  },
  [dashboardRuleTopics.grid]: {
    prompt: {
      review: {
        critical: [
          'Any w or h that violates ### Grid sizes by chart type or Grid Packing Rules is a critical issue. A last panel in a row stretched to fill leftover columns (row sums to 48) is not this issue — except a datatable with w less than 24, which is always this issue.',
          'Visible gaps or dead space is a critical issue: unused columns in a row, leftover odd widths (not 6/8/12/24/48), or a row/section that was only partly reflowed. Rethink where panels live — do not patch a subset.',
          'An L-shaped hole is a critical issue — a short panel with empty space beside it while a taller neighbor continues. Do not invent that packing.',
          'A datatable with w less than 24 is a critical issue — give it its own row at w: 48, or w: 24 beside another half-width panel.',
        ],
      },
      config: {
        rules: [gridLayoutPrompt.trim()],
      },
    },
  },
  [dashboardRuleTopics.controls]: {
    prompt: {
      review: {
        critical: [
          'A new multi-entity dashboard with no categorical controls is a critical issue.',
          'More than one time_slider_control is a critical issue.',
        ],
      },
      config: {
        rules: [dashboardControlsPrompt.trim()],
      },
    },
  },
};
