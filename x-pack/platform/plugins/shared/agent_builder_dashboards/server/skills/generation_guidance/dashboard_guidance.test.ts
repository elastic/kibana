/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChartTypeReviewPromptContent } from '@kbn/agent-builder-visualizations-server';
import {
  getDashboardDesignPromptContent,
  getDashboardReviewPromptContent,
  getDashboardReviewTopicsContent,
} from './dashboard_guidance';

describe('dashboard guidance', () => {
  it('flags a large or multi-topic dashboard with no topical sections', () => {
    const review = getDashboardReviewTopicsContent();
    expect(review).toContain('no topical sections is a critical issue');
    expect(review).toContain('remove_panels');
    expect(review).toContain('add_section');
  });

  it('flags leftover grid gaps and panels in the wrong section', () => {
    const review = getDashboardReviewTopicsContent();
    expect(review).toContain('partly reflowed');
    expect(review).toContain('wrong topical section');
    expect(review).toContain('rethink where panels live');
    expect(review).toContain('KPI-only');
    expect(review).toContain('L-shaped hole');
    expect(review).toContain(
      'Any w or h that violates ### Grid sizes by chart type or Grid Packing Rules is a critical issue.'
    );
  });

  it('lets the last panel in a row stretch to fill leftover columns', () => {
    const design = getDashboardDesignPromptContent();
    const review = getDashboardReviewTopicsContent();

    expect(design).toMatch(/last panel in (a |the )?row/i);
    expect(design).toMatch(/xy-bar\s+\(x:0,\s+y:15,\s+w:48/);
    expect(review).toContain('last panel in a row');
    expect(review).toContain('not this issue');
  });

  it('gives metric breakdowns more room, allows pie at 12 or 24, and keeps maps at least 24 wide', () => {
    const design = getDashboardDesignPromptContent();

    expect(design).toMatch(/\*\*Metric\*\*.*w: 6, 8, or 12/);
    expect(design).toMatch(/Metric with breakdown[\s\S]*w: 12, h: 8–12/);
    expect(design).toMatch(/\*\*Pie\*\*.*w: 12 or 24/);
    expect(design).toMatch(/\*\*Heatmap\*\*.*w: 24/);
    expect(design).toMatch(/\*\*Tagcloud\*\*.*w: 24/);
    expect(design).toMatch(/\*\*Region map\*\*.*w: 24/);
  });

  it('keeps datatables at least 24 wide and flags narrower widths as critical', () => {
    const design = getDashboardDesignPromptContent();
    const review = getDashboardReviewTopicsContent();

    expect(design).toMatch(/\*\*Datatable\*\*.*w: 48/);
    expect(design).toMatch(/Never narrower than `w: 24`/);
    expect(design).toMatch(/leftover columns are fewer than 24 and the next panel is a datatable/);
    expect(review).toContain('A datatable with w less than 24 is a critical issue');
    expect(review).toContain('except a datatable with w less than 24');
  });

  it('appends chart-type review as a whole without restating it', () => {
    const review = getDashboardReviewPromptContent();
    const dashboardTopics = getDashboardReviewTopicsContent();
    const chartReview = getChartTypeReviewPromptContent();

    expect(dashboardTopics).not.toContain('CHART REVIEW RULES');
    expect(review).toBe([dashboardTopics, chartReview].filter(Boolean).join('\n'));
  });

  it('compiles design and dashboard review topics', () => {
    expect({
      design: getDashboardDesignPromptContent(),
      review: getDashboardReviewTopicsContent(),
    }).toMatchInlineSnapshot(`
      Object {
        "design": "## Dashboard Design
      ## Dashboard Composition Guidelines

      A well-composed dashboard tells a coherent story about the data:

      1. **Consider a markdown panel when it adds value** — to set context about what the dashboard monitors, data sources, or important notes. Not every dashboard needs one.
      2. **Lead with high-level metrics** (Metric or Gauge panels): total counts, averages, key performance indicators that give an at-a-glance summary.
      3. **Follow with time-series trends** (XY line/area panels): how the key metrics change over time.
      4. **Add breakdowns and distributions** (XY bar, Heatmap, Tagcloud panels): top-N rankings, categorical splits, and density views.
      5. **Include as many panels as are valuable for the underlying data and user intent.** Let the richness and diversity of the available fields drive the panel count instead of a fixed numeric target.
      6. **Every panel should serve a clear purpose.** Do not add panels just to fill space, but do not artificially limit the dashboard when more panels would provide genuine insight.

      When the user's request is vague (e.g., \\"create a dashboard for my logs\\"), explore the discovered index mapping thoroughly and compose a rich dashboard that covers the breadth of the available data — overview metrics, time-series trends, breakdowns, and distributions. Let the fields drive the panel count rather than defaulting to a minimal set.

      ### When to use sections

      - Keep small dashboards flat when a single sequence of panels is easy to scan.
      - Use sections when panels fall into distinct topics such as overview metrics, trends, breakdowns, or per-domain groupings.
      - Prefer sections for larger dashboards, especially when there are roughly 6 or more visualization panels or when the layout would otherwise feel long and hard to navigate.
      - Do not add sections only for decoration. Use them when they make the dashboard structure clearer.
      - Put each panel in the section that matches its role: KPIs in Overview/Key Metrics, time series in Trends, rankings and distributions in Breakdowns. Overview/Key Metrics is KPI-only — do not invent a mixed section by parking a table or trend there. If placement is wrong, rethink where panels live: \`add_section\` with the panels that belong there and \`remove_panels\` the old copies — do not only tweak widths in place.
      ## Panel Layout

      The dashboard uses a **48-column grid**. On a 16:9 screen, roughly **20–24 rows** are visible without scrolling. Aim for **8–12 panels above the fold**.

      Every \`add_panels.panels[]\` item and every \`add_section.panels[]\` item requires \`grid: { x, y, w, h }\`. The origin \`(0, 0)\` is the top-left corner.

      ### Grid sizes by chart type

      Use these sizes — **do not make metric or gauge panels full-width**:

      - **Metric** → \`w: 6, 8, or 12, h: 5–6\`. These are single-number panels — keep them **small**. Fit 4–8 per row.
        - 8 metrics in a row: each \`w: 6, h: 5\`
        - 6 metrics in a row: each \`w: 8, h: 5\`
        - 4 metrics in a row: each \`w: 12, h: 5\`
      - **Metric with breakdown** → \`w: 12, h: 8–12\`. Needs room for the breakdown tiles — larger than a single KPI. Do not keep these at \`w: 6\`.
      - **Gauge** → \`w: 12, h: 8\`. Fit up to 4 per row.
      - **XY (line / area / bar)** → \`w: 24, h: 10\`.
      - **Heatmap** → \`w: 24, h: 10\`.
      - **Tagcloud** → \`w: 24, h: 10\`.
      - **Pie** → \`w: 12 or 24, h: 10\`.
      - **Region map** → \`w: 24, h: 10\`. Stay at least 24 wide.
      - **Treemap / Waffle / Mosaic** → \`w: 24, h: 10\`.
      - **Markdown** → \`w: 24–48, h: 4–9\`. Size based on content length and layout needs — not always full-width.
      - **Datatable** → \`w: 48, h: 12–16\` on its own row so columns are readable. \`w: 24\` only when sharing a row with another half-width panel. Never narrower than \`w: 24\` — \`w: 16\` is wrong. Do not shrink a table to fill a leftover sliver; give it its own row instead.

      Prefer \`w\` values that divide 48 evenly: **6, 8, 12, 24, 48**.

      **Grid Packing Rules:**

      - **Stretch the last panel in a row:** Table sizes are the default when panels pack evenly. If leftover columns remain, the last panel in that row — any chart type except a datatable that would end up narrower than \`w: 24\` — stretches so the row sums to 48. A single panel on a row is last, so it is full-width (e.g. the breakdown \`xy-bar\` at \`w: 48\` in the example). Do not leave unused columns beside the last panel. Metric and gauge still must not sit alone at \`w: 48\` — keep those small. If leftover columns are fewer than 24 and the next panel is a datatable, start a new row at \`w: 48\` instead of squeezing the table into the sliver.
      - **Eliminate Dead Space:** Always calculate the bottom edge (\`y + h\`) of every panel. When starting a new row or
        placing panels below a row, set the new row's \`y\` to **previous row's \`y + max(h)\`** across all panels in that row — do not use only one neighbor's \`y + h\`.
      - **Align Row Heights:** If multiple panels are placed side-by-side in a row (e.g., sharing the same \`y\` coordinate),
        they should generally have the exact same height (\`h\`). If they do not, you must fill the resulting empty vertical
        space before placing the next full-width panel.

      ### Positioning rules

      Always set \`x\` and \`y\` so panels tile with **no gaps**:

      1. **Fill rows left to right.** Start at \`x: 0\`. The next panel's \`x\` = previous panel's \`x + w\`. When a panel would exceed column 48, start a new row.
      2. **New row \`y\`** = previous row's \`y + max(h)\` of all panels in that row.
      3. **Same \`h\` per row** when possible, so rows align cleanly.
      4. Panels' \`x + w\` must never exceed 48.
      5. **When updating a dashboard**, inspect the existing panels' \`grid\` from the previous tool result. If there is empty space (a gap where a panel was removed, or unused columns beside a tall panel), place the new panel in that gap instead of appending below — but never fill a KPI-row gap with a different chart type (table, trend, pie), and never drop a datatable into a gap narrower than \`w: 24\`. Start a new row instead. Choose \`w\` and \`h\` to fit the available space.
      6. **Markdown panels** use agent-specified \`grid\` like any other panel. Size based on content length (\`w: 24–48, h: 4–9\`). Account for their height when positioning subsequent panels.

      ### Reflow after removals

      - If removing a panel leaves a gap in a row, shift the affected neighboring panels left by re-adding them with updated \`x\` values.
      - If removing a panel leaves later rows with unnecessary empty space above them, re-add the affected panels with updated \`y\` values.
      - On update or prettify, review grid positions and composition together. If anything violates, rethink where panels live and reflow every existing panel — do not resize a subset and leave empty space.
      - Do not invent custom packing: never leave a hole under a shorter panel, never stretch a table or trend to fill leftover height next to KPIs. Put KPIs in one even row; other chart types start on the next row.

      ### Section grid rules

      - When using \`add_section\`, each section has its own coordinate space.
      - Panels nested under \`add_section.panels\` use that same section-relative coordinate space.
      - Panel coordinates inside a section are section-relative: each section starts at \`y: 0\`. The same 48-column grid and sizing guidance apply within each section.
      - A section occupies exactly one row (\`h: 1\`) in the outer dashboard grid. When placing widgets after a section, compute the next outer \`y\` as \`section.grid.y + 1\` (not by summing internal panel heights).
      - Internal section panel heights affect layout inside the section only; they do not increase the section's outer-grid height.
      - When mixing top-level panels and sections, compute outer \`y\` sequentially: top-level panels advance by \`y + h\`, sections advance by \`y + 1\`.
      - **Inserting above existing sections:** Top-level panels and sections share the same outer grid coordinates. If a section occupies \`y: 0\`, a new top-level panel at \`y: 0\` will collide and be pushed **below** the section. To place a panel above an existing section, first \`remove_section\` (with \`panelAction: \\"promote\\"\` or \`\\"delete\\"\`) and re-add it via \`add_section\` at a higher \`y\` to make room, then add the panel at the freed \`y\`.

      ### Example: 4 KPI metrics + 2 time-series charts + 1 breakdown bar chart

      The last \`xy-bar\` is alone on its row, so it stretches to \`w: 48\`.

      \`\`\`
      metric  (x:0,  y:0,  w:12, h:5)
      metric  (x:12, y:0,  w:12, h:5)
      metric  (x:24, y:0,  w:12, h:5)
      metric  (x:36, y:0,  w:12, h:5)
      xy-line (x:0,  y:5,  w:24, h:10)
      xy-line (x:24, y:5,  w:24, h:10)
      xy-bar  (x:0,  y:15, w:48, h:10)
      \`\`\`
      ## Controls

      Controls are interactive filters pinned above the dashboard that let users explore data without editing queries. Add them with \`add_controls\` and remove them by id with \`remove_controls\`.

      **When building a new dashboard from scratch**, proactively add 3–5 \`options_list_control\` dropdowns for the most useful categorical fields. Pick fields that appear in panel \`BY\` / \`WHERE\` clauses, prefer low-cardinality keyword fields (e.g. \`service.name\`, \`host.name\`, \`env\`, \`region\`, \`kubernetes.namespace\`, \`http.response.status_code\`). Avoid high-cardinality identifiers (trace IDs, request IDs, UUIDs).

      Do not add controls to dashboards already scoped to a single entity (one host, one service, etc.).

      **Control types:**
      - \`options_list_control\` — dropdown for categorical / keyword fields. The most common type (95% of cases).
      - \`range_slider_control\` — numeric range slider. Add sparingly, only when filtering by a numeric threshold is useful across multiple panels (e.g. \`latency\`, \`bytes\`, \`duration\`).
      - \`time_slider_control\` — global time sub-range picker. Add at most one per dashboard, only when time-range narrowing within the global window is useful.

      **Required fields per control:**
      - \`type\`: one of the three above.
      - \`field_name\` (not for \`time_slider_control\`): exact field name as it appears in the panel queries (e.g. \`\\"service.name\\"\`).
      - \`index\` (not for \`time_slider_control\`): same index as the dashboard panels (e.g. \`\\"logs-*\\"\`).
      - \`title\` (optional, \`options_list_control\` and \`range_slider_control\` only): human-readable label shown above the control (e.g. \`\\"Service\\"\`).

      **Defaults applied by the server:** \`width: \\"medium\\"\`, \`grow: true\` (fills available horizontal space). Override only if the user asks.

      **Removing controls:** use \`remove_controls\` with the \`id\` values from the \`controls[]\` list in the tool result.",
        "review": "## Dashboard Review
      ### composition
      Critical:
      - Sections used only for decoration, with no topical grouping, are a critical issue.
      - A dashboard with about 6 or more visualization panels, or with distinct topics such as overview KPIs, trends, and breakdowns, that has no topical sections is a critical issue. Add named sections (\`add_section\`) with those panels, then \`remove_panels\` the old copies. A small single-topic dashboard that scans as one sequence is not this issue. If topical sections already group the panels, this is not an issue.
      - A panel in the wrong topical section is a critical issue — for example a KPI at top-level or in Trends/Breakdowns when an Overview/Key Metrics section exists, or a time-series among KPIs. Put it in the right section with \`add_section\` panels and \`remove_panels\` the old copy.
      - Key Metrics / Overview must be KPI-only. A table or time series in that section is a critical issue — move it out. Do not invent a mixed-role section.
      - A piecemeal layout is a critical issue — resizing a couple of panels and leaving gaps or misplaced panels. Review grid positions and composition together; if anything violates, rethink where panels live.
      - A dashboard that has time-series XY panels but none with legend statistics (avg/min/max) is a critical issue. Add them on one primary overview trend (at most two). The edit query MUST include the exact phrase \\"show avg/min/max in the legend\\" (e.g. \\"log volume over time, show avg/min/max in the legend\\"). Skip categorical bars and queries whose measure is already AVG/MIN/MAX of a field. If at least one already has them, this is not an issue.
      ### grid
      Critical:
      - Any w or h that violates ### Grid sizes by chart type or Grid Packing Rules is a critical issue. A last panel in a row stretched to fill leftover columns (row sums to 48) is not this issue — except a datatable with w less than 24, which is always this issue.
      - Visible gaps or dead space is a critical issue: unused columns in a row, leftover odd widths (not 6/8/12/24/48), or a row/section that was only partly reflowed. Rethink where panels live — do not patch a subset.
      - An L-shaped hole is a critical issue — a short panel with empty space beside it while a taller neighbor continues. Do not invent that packing.
      - A datatable with w less than 24 is a critical issue — give it its own row at w: 48, or w: 24 beside another half-width panel.
      ### controls
      Critical:
      - A new multi-entity dashboard with no categorical controls is a critical issue.
      - More than one time_slider_control is a critical issue.",
      }
    `);
  });
});
