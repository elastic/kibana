/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Dashboard-level prompt topics. Same shape as the chart-type registry:
 * `config.rules` is HOW shared with review; `config.authoringOnly` is HOW
 * for the dashboard agent only; `review.misses` / `review.considerations`
 * are compiled only into the review prompt.
 */
export interface DashboardRuleEntry {
  prompt: {
    /**
     * One-line "what this topic covers and when it applies".
     */
    selection: string;
    review?: {
      misses?: string[];
      considerations?: string[];
    };
    config?: {
      rules?: string[];
      /**
       * HOW for the dashboard agent only. Not compiled into the review prompt —
       * the judge cannot verify input-schema details such as server defaults.
       */
      authoringOnly?: string[];
    };
  };
}

export const dashboardRuleTopics = {
  composition: 'composition',
  grid: 'grid',
  controls: 'controls',
  sections: 'sections',
} as const;

export type DashboardRuleTopic = (typeof dashboardRuleTopics)[keyof typeof dashboardRuleTopics];

export type DashboardRuleRegistry = Record<DashboardRuleTopic, DashboardRuleEntry>;

export const dashboardRuleRegistry: DashboardRuleRegistry = {
  [dashboardRuleTopics.composition]: {
    prompt: {
      selection:
        'How to compose a dashboard story: metrics first, then trends, then breakdowns, with as many useful panels as the data supports.',
      review: {
        considerations: [
          'Consider a markdown panel when it adds value — context about what the dashboard monitors, data sources, or important notes. Not every dashboard needs one. Markdown should be placed at the top of the dashboard.',
          'When the request is vague, consider covering the breadth of the available fields (overview metrics, trends, breakdowns, distributions) instead of a minimal set.',
        ],
      },
      config: {
        rules: [
          'Lead with high-level metrics (Metric or Gauge): total counts, averages, KPIs that give an at-a-glance summary.',
          'Follow with time-series trends (XY line/area): how the key metrics change over time.',
          'Add breakdowns and distributions (XY bar, Heatmap, Tagcloud): top-N rankings, categorical splits, and density views.',
          'Include as many panels as are valuable for the underlying data and user intent. Let the fields drive the panel count instead of a fixed numeric target.',
          'Every panel should serve a clear purpose. Do not add panels just to fill space, but do not artificially limit the dashboard when more panels would provide genuine insight.',
        ],
      },
    },
  },
  [dashboardRuleTopics.grid]: {
    prompt: {
      selection:
        '48-column packing: size panels by chart type, tile with no gaps, keep single-value metrics small, and give metric breakdowns more room.',
      review: {
        misses: [
          'A full-width single-value metric or gauge is a miss — a single KPI stays at w: 12; two or more KPI metrics on one row share the 48 columns equally (never w: 48). Gauges stay at w: 12. A metric with a categorical breakdown is not this miss — those may be w: 12 or 24.',
          'A KPI-metric-only row of 2+ panels that leaves unused columns (sum(w) < 48) is a miss — e.g. four metrics at w: 6 occupying only x: 0–24. Required: 2→24, 3→16, 4→12, 6→8, 8→6. A single metric at w: 12 with empty space to the right is not this miss. Metric-breakdown panels are not this miss.',
          'A metric breakdown packed at KPI size (w ≤ 12 and h ≤ 6) is a miss — give breakdown metrics at least w: 24, h: 8. Use the panel config (breakdown_by), query, or authoring_note to tell a single KPI from a breakdown.',
          'Visible gaps or dead space between panels is a miss — rows must tile left-to-right with no unused columns, and the next row y must be previous row y + max(h).',
          'A pie panel wider than w: 24 is a miss.',
          'A heatmap, tagcloud, or region_map narrower than w: 24 is a miss — these stay at w: 24 (or w: 48 if they are the only panel on the row).',
        ],
      },
      config: {
        rules: [
          'The dashboard uses a 48-column grid. On a 16:9 screen, roughly 20–24 rows are visible without scrolling. Aim for 8–12 panels above the fold.',
          'Every add_panels.panels[] item and every add_section.panels[] item requires grid: { x, y, w, h }. The origin (0, 0) is the top-left corner.',
          'Metric (single KPI, no breakdown) → pick w from the count on that row so the row fills all 48 columns. 8→w:6; 6→w:8; 4→w:12; 3→w:16; 2→w:24. A single metric stays at w: 12. h: 5–6. Keep them small; do not make a single-value metric or gauge full-width.',
          'Metric breakdown (one measure split by a category — Lens breakdown_by, e.g. "error count by status", "CPU by host") → give it more space so the tiles are readable: w: 24, h: 8–10. Do not pack breakdown metrics into the small KPI sizes (w: 6, h: 5–6).',
          'Gauge → w: 12, h: 8. Fit up to 4 per row.',
          'XY (line / area / bar) → w: 24, h: 10. Use full-width (w: 48) only for the primary time series.',
          'Heatmap, tagcloud, and region_map → w: 24, h: 10. Never narrower than 24. Use w: 48 only when the panel is alone on the row. Pie → w: 12 or 24, h: 10. Treemap / waffle / mosaic → w: 24, h: 10.',
          'Markdown → w: 24–48, h: 4–9, sized from content. Datatable → w: 24–48, h: 12–16; prefer full-width so columns are readable.',
          'Prefer w values that divide 48 evenly: 6, 8, 12, 16, 24, 48.',
          'Eliminate dead space: when starting a new row, set y to the previous row y + max(h) across all panels in that row — do not use only one neighbor y + h.',
          'Align row heights: side-by-side panels that share y should generally have the same h. If they do not, fill the empty vertical space before the next full-width panel.',
          'Fill rows left to right from x: 0. Next x = previous x + w. When a panel would exceed column 48, start a new row. x + w must never exceed 48.',
          'When updating a dashboard, inspect existing grid from the previous tool result. If there is a gap, place the new panel there instead of appending below.',
          'After removals, shift neighbors left and pull later rows up so unused space is not left behind.',
        ],
      },
    },
  },
  [dashboardRuleTopics.controls]: {
    prompt: {
      selection:
        'Interactive filters pinned above the dashboard so users can explore without editing queries.',
      review: {
        misses: [
          'A new multi-entity dashboard with no categorical controls is a miss — add 3–5 options_list_control dropdowns for useful low-cardinality fields.',
          'A control on a high-cardinality identifier (trace id, request id, UUID) is a miss.',
          'More than one time_slider_control is a miss.',
          'Do not flag missing field_name, index, or esql_query — those are authoring-input details, not painted misses. A listed control with type (and optional title) is complete.',
          'Do not flag control field names, ECS paths, or whether a field exists — the judge has no index mapping.',
        ],
        considerations: [
          'Add a range_slider_control only when a numeric threshold is useful across multiple panels.',
        ],
      },
      config: {
        rules: [
          'When building a new dashboard from scratch, proactively add 3–5 `options_list_control` dropdowns for the most useful categorical fields. Copy `field_name` exactly from a panel BY / WHERE clause you already wrote or you know from index mapping — do not invent, rename, or "correct" ECS paths. Prefer low-cardinality keyword fields. Avoid high-cardinality identifiers (trace IDs, request IDs, UUIDs).',
          'Do not add controls to dashboards already scoped to a single entity (one host, one service, etc.).',
          'options_list_control — dropdown for categorical / keyword fields. The most common type (95% of cases).',
          'range_slider_control — numeric range slider. Add sparingly, only when filtering by a numeric threshold is useful across multiple panels (e.g. latency, bytes, duration).',
          'time_slider_control — global time sub-range picker. Add at most one per dashboard, only when time-range narrowing within the global window is useful.',
        ],
        authoringOnly: [
          'Required fields: type; field_name and index for options_list_control and range_slider_control (exact field name and the same index as the panels); optional title for those two types.',
          'Defaults applied by the server: width: "medium", grow: true. Override only if the user asks.',
          'Remove controls with remove_controls using the id values from the controls[] list in the tool result.',
        ],
      },
    },
  },
  [dashboardRuleTopics.sections]: {
    prompt: {
      selection:
        'Topic grouping and section-relative grid: use sections when they make a larger dashboard easier to scan.',
      review: {
        misses: ['Sections used only for decoration, with no topical grouping, are a miss.'],
        considerations: [
          'Keep a small dashboard flat when a single sequence of panels is already easy to scan.',
        ],
      },
      config: {
        rules: [
          'Keep small dashboards flat when a single sequence of panels is easy to scan.',
          'Use sections when panels fall into distinct topics such as overview metrics, trends, breakdowns, or per-domain groupings. Prefer sections when there are roughly 6 or more visualization panels.',
          'Do not add sections only for decoration.',
          'When using add_section, each section has its own coordinate space starting at y: 0. The same 48-column grid and sizing guidance apply inside the section.',
          'A section occupies exactly one row (h: 1) in the outer dashboard grid. After a section, the next outer y is section.grid.y + 1 — do not sum internal panel heights.',
          'When mixing top-level panels and sections, compute outer y sequentially: top-level panels advance by y + h, sections advance by y + 1.',
          'To place a panel above an existing section at y: 0, first remove_section (panelAction: "promote" or "delete") and re-add the section at a higher y, then add the panel at the freed y.',
        ],
      },
    },
  },
};
