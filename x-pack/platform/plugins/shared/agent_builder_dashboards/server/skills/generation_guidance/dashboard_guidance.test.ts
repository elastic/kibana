/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardManagementSkill as skill } from '../dashboard_management_skill';
import {
  getDashboardAuthoringPromptContent,
  getDashboardReviewPromptContent,
} from './dashboard_guidance';

describe('dashboard guidance', () => {
  it('compiles authoring, review, and skill prompt content', () => {
    expect({
      authoring: getDashboardAuthoringPromptContent(),
      review: getDashboardReviewPromptContent(),
      skill: skill.content,
    }).toMatchInlineSnapshot(`
      Object {
        "authoring": "## Dashboard Design
      ### composition
      - Lead with high-level metrics (Metric or Gauge): total counts, averages, KPIs that give an at-a-glance summary.
      - Follow with time-series trends (XY line/area): how the key metrics change over time.
      - Add breakdowns and distributions (XY bar, Heatmap, Tagcloud): top-N rankings, categorical splits, and density views.
      - Include as many panels as are valuable for the underlying data and user intent. Let the fields drive the panel count instead of a fixed numeric target.
      - Every panel should serve a clear purpose. Do not add panels just to fill space, but do not artificially limit the dashboard when more panels would provide genuine insight.
      ### grid
      - The dashboard uses a 48-column grid. On a 16:9 screen, roughly 20–24 rows are visible without scrolling. Aim for 8–12 panels above the fold.
      - Every add_panels.panels[] item and every add_section.panels[] item requires grid: { x, y, w, h }. The origin (0, 0) is the top-left corner.
      - Metric (single KPI, no breakdown) → pick w from the count on that row so the row fills all 48 columns. 8→w:6; 6→w:8; 4→w:12; 3→w:16; 2→w:24. A single metric stays at w: 12. h: 5–6. Keep them small; do not make a single-value metric or gauge full-width.
      - Metric breakdown (one measure split by a category — Lens breakdown_by, e.g. \\"error count by status\\", \\"CPU by host\\") → give it more space so the tiles are readable: w: 24, h: 8–10. Do not pack breakdown metrics into the small KPI sizes (w: 6, h: 5–6).
      - Gauge → w: 12, h: 8. Fit up to 4 per row.
      - XY (line / area / bar) → w: 24, h: 10. Use full-width (w: 48) only for the primary time series.
      - Heatmap, tagcloud, and region_map → w: 24, h: 10. Never narrower than 24. Use w: 48 only when the panel is alone on the row. Pie → w: 12 or 24, h: 10. Treemap / waffle / mosaic → w: 24, h: 10.
      - Markdown → w: 24–48, h: 4–9, sized from content. Datatable → w: 24–48, h: 12–16; prefer full-width so columns are readable.
      - Prefer w values that divide 48 evenly: 6, 8, 12, 16, 24, 48.
      - Eliminate dead space: when starting a new row, set y to the previous row y + max(h) across all panels in that row — do not use only one neighbor y + h.
      - Align row heights: side-by-side panels that share y should generally have the same h. If they do not, fill the empty vertical space before the next full-width panel.
      - Fill rows left to right from x: 0. Next x = previous x + w. When a panel would exceed column 48, start a new row. x + w must never exceed 48.
      - When updating a dashboard, inspect existing grid from the previous tool result. If there is a gap, place the new panel there instead of appending below.
      - After removals, shift neighbors left and pull later rows up so unused space is not left behind.
      ### controls
      - When building a new dashboard from scratch, proactively add 3–5 \`options_list_control\` dropdowns for the most useful categorical fields. Copy \`field_name\` exactly from a panel BY / WHERE clause you already wrote or you know from index mapping — do not invent, rename, or \\"correct\\" ECS paths. Prefer low-cardinality keyword fields. Avoid high-cardinality identifiers (trace IDs, request IDs, UUIDs).
      - Do not add controls to dashboards already scoped to a single entity (one host, one service, etc.).
      - options_list_control — dropdown for categorical / keyword fields. The most common type (95% of cases).
      - range_slider_control — numeric range slider. Add sparingly, only when filtering by a numeric threshold is useful across multiple panels (e.g. latency, bytes, duration).
      - time_slider_control — global time sub-range picker. Add at most one per dashboard, only when time-range narrowing within the global window is useful.
      - Required fields: type; field_name and index for options_list_control and range_slider_control (exact field name and the same index as the panels); optional title for those two types.
      - Defaults applied by the server: width: \\"medium\\", grow: true. Override only if the user asks.
      - Remove controls with remove_controls using the id values from the controls[] list in the tool result.
      ### sections
      - Keep small dashboards flat when a single sequence of panels is easy to scan.
      - Use sections when panels fall into distinct topics such as overview metrics, trends, breakdowns, or per-domain groupings. Prefer sections when there are roughly 6 or more visualization panels.
      - Do not add sections only for decoration.
      - When using add_section, each section has its own coordinate space starting at y: 0. The same 48-column grid and sizing guidance apply inside the section.
      - A section occupies exactly one row (h: 1) in the outer dashboard grid. After a section, the next outer y is section.grid.y + 1 — do not sum internal panel heights.
      - When mixing top-level panels and sections, compute outer y sequentially: top-level panels advance by y + h, sections advance by y + 1.
      - To place a panel above an existing section at y: 0, first remove_section (panelAction: \\"promote\\" or \\"delete\\") and re-add the section at a higher y, then add the panel at the freed y.",
        "review": "DASHBOARD REVIEW RULES:
      ### composition
      - Lead with high-level metrics (Metric or Gauge): total counts, averages, KPIs that give an at-a-glance summary.
      - Follow with time-series trends (XY line/area): how the key metrics change over time.
      - Add breakdowns and distributions (XY bar, Heatmap, Tagcloud): top-N rankings, categorical splits, and density views.
      - Include as many panels as are valuable for the underlying data and user intent. Let the fields drive the panel count instead of a fixed numeric target.
      - Every panel should serve a clear purpose. Do not add panels just to fill space, but do not artificially limit the dashboard when more panels would provide genuine insight.
      Considerations:
      - Consider a markdown panel when it adds value — context about what the dashboard monitors, data sources, or important notes. Not every dashboard needs one. Markdown should be placed at the top of the dashboard.
      - When the request is vague, consider covering the breadth of the available fields (overview metrics, trends, breakdowns, distributions) instead of a minimal set.
      ### grid
      - The dashboard uses a 48-column grid. On a 16:9 screen, roughly 20–24 rows are visible without scrolling. Aim for 8–12 panels above the fold.
      - Every add_panels.panels[] item and every add_section.panels[] item requires grid: { x, y, w, h }. The origin (0, 0) is the top-left corner.
      - Metric (single KPI, no breakdown) → pick w from the count on that row so the row fills all 48 columns. 8→w:6; 6→w:8; 4→w:12; 3→w:16; 2→w:24. A single metric stays at w: 12. h: 5–6. Keep them small; do not make a single-value metric or gauge full-width.
      - Metric breakdown (one measure split by a category — Lens breakdown_by, e.g. \\"error count by status\\", \\"CPU by host\\") → give it more space so the tiles are readable: w: 24, h: 8–10. Do not pack breakdown metrics into the small KPI sizes (w: 6, h: 5–6).
      - Gauge → w: 12, h: 8. Fit up to 4 per row.
      - XY (line / area / bar) → w: 24, h: 10. Use full-width (w: 48) only for the primary time series.
      - Heatmap, tagcloud, and region_map → w: 24, h: 10. Never narrower than 24. Use w: 48 only when the panel is alone on the row. Pie → w: 12 or 24, h: 10. Treemap / waffle / mosaic → w: 24, h: 10.
      - Markdown → w: 24–48, h: 4–9, sized from content. Datatable → w: 24–48, h: 12–16; prefer full-width so columns are readable.
      - Prefer w values that divide 48 evenly: 6, 8, 12, 16, 24, 48.
      - Eliminate dead space: when starting a new row, set y to the previous row y + max(h) across all panels in that row — do not use only one neighbor y + h.
      - Align row heights: side-by-side panels that share y should generally have the same h. If they do not, fill the empty vertical space before the next full-width panel.
      - Fill rows left to right from x: 0. Next x = previous x + w. When a panel would exceed column 48, start a new row. x + w must never exceed 48.
      - When updating a dashboard, inspect existing grid from the previous tool result. If there is a gap, place the new panel there instead of appending below.
      - After removals, shift neighbors left and pull later rows up so unused space is not left behind.
      - A full-width single-value metric or gauge is a miss — a single KPI stays at w: 12; two or more KPI metrics on one row share the 48 columns equally (never w: 48). Gauges stay at w: 12. A metric with a categorical breakdown is not this miss — those may be w: 12 or 24.
      - A KPI-metric-only row of 2+ panels that leaves unused columns (sum(w) < 48) is a miss — e.g. four metrics at w: 6 occupying only x: 0–24. Required: 2→24, 3→16, 4→12, 6→8, 8→6. A single metric at w: 12 with empty space to the right is not this miss. Metric-breakdown panels are not this miss.
      - A metric breakdown packed at KPI size (w ≤ 12 and h ≤ 6) is a miss — give breakdown metrics at least w: 24, h: 8. Use the authoring_note or query to tell a single KPI from a breakdown.
      - Visible gaps or dead space between panels is a miss — rows must tile left-to-right with no unused columns, and the next row y must be previous row y + max(h).
      - A pie panel wider than w: 24 is a miss.
      - A heatmap, tagcloud, or region_map narrower than w: 24 is a miss — these stay at w: 24 (or w: 48 if they are the only panel on the row).
      ### controls
      - When building a new dashboard from scratch, proactively add 3–5 \`options_list_control\` dropdowns for the most useful categorical fields. Copy \`field_name\` exactly from a panel BY / WHERE clause you already wrote or you know from index mapping — do not invent, rename, or \\"correct\\" ECS paths. Prefer low-cardinality keyword fields. Avoid high-cardinality identifiers (trace IDs, request IDs, UUIDs).
      - Do not add controls to dashboards already scoped to a single entity (one host, one service, etc.).
      - options_list_control — dropdown for categorical / keyword fields. The most common type (95% of cases).
      - range_slider_control — numeric range slider. Add sparingly, only when filtering by a numeric threshold is useful across multiple panels (e.g. latency, bytes, duration).
      - time_slider_control — global time sub-range picker. Add at most one per dashboard, only when time-range narrowing within the global window is useful.
      - A new multi-entity dashboard with no categorical controls is a miss — add 3–5 options_list_control dropdowns for useful low-cardinality fields.
      - A control on a high-cardinality identifier (trace id, request id, UUID) is a miss.
      - More than one time_slider_control is a miss.
      - Do not flag missing field_name, index, or esql_query — they are omitted from this summary. A listed control with type (and optional title) is complete.
      - Do not flag control field names, ECS paths, or whether a field exists — the judge has no index mapping.
      Considerations:
      - Add a range_slider_control only when a numeric threshold is useful across multiple panels.
      ### sections
      - Keep small dashboards flat when a single sequence of panels is easy to scan.
      - Use sections when panels fall into distinct topics such as overview metrics, trends, breakdowns, or per-domain groupings. Prefer sections when there are roughly 6 or more visualization panels.
      - Do not add sections only for decoration.
      - When using add_section, each section has its own coordinate space starting at y: 0. The same 48-column grid and sizing guidance apply inside the section.
      - A section occupies exactly one row (h: 1) in the outer dashboard grid. After a section, the next outer y is section.grid.y + 1 — do not sum internal panel heights.
      - When mixing top-level panels and sections, compute outer y sequentially: top-level panels advance by y + h, sections advance by y + 1.
      - To place a panel above an existing section at y: 0, first remove_section (panelAction: \\"promote\\" or \\"delete\\") and re-add the section at a higher y, then add the panel at the freed y.
      - Sections used only for decoration, with no topical grouping, are a miss.
      Considerations:
      - Keep a small dashboard flat when a single sequence of panels is already easy to scan.",
        "skill": "## When to Use This Skill

      Use this skill when:
      - A user asks to find, list, inspect, or modify existing Kibana dashboards.
      - A user asks to create a dashboard from one or more visualizations.
      - A user asks to update a dashboard created earlier in the conversation.
      - A request involves dashboard metadata, markdown, panel, or section changes.

      Do **not** use this skill when:
      - The user asks for a standalone visualization and does not mention a dashboard context.
      - The user needs help exploring data, fields, or query logic.

      ## Building a Dashboard

      The platform.dashboard.generate_dashboard tool builds the resulting dashboard from the current dashboard (if any) plus an ordered \`operations\` array. This section describes the \`operations\` vocabulary; see the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

      Every dashboard MUST have a non-empty \`title\`. If the current dashboard's title is empty, missing, or \`\\"User Dashboard\\"\`, your first operation MUST be \`set_metadata\` with a title you invent from its contents.

      Operations run in order, so earlier operations should set up state needed by later ones. Batch all operations into a single platform.dashboard.generate_dashboard call whenever possible.

      When a dashboard needs sections, prefer a single batched call:
      1. Use \`add_section\` with its optional \`panels\` array when you already know the panels that belong in the new section.
      2. Use a follow-up \`add_panels\` with per-item \`sectionId\` only when you need to target an existing section returned by an earlier tool result.

      For a new dashboard:
      - Start with \`set_metadata\` and provide both \`title\` and \`description\`. Only include \`time_range\` when the user explicitly named a specific time window (e.g. \\"last 7 days\\", \\"May 20–24\\"). Do not set it otherwise — a data-aware default is applied automatically.
      - Use \`add_panels\` to add panels in one batched operation. A single \`add_panels\` call may mix panel kinds and target different \`sectionId\` values, so batch related panels together.
      - Use \`add_section\` when panels naturally group into distinct topics or the dashboard is large enough that sections improve scanability. Include \`panels\` on the section when you can create that section's initial panels immediately.

      For an existing dashboard:
      - Prefer \`edit_panels\` to change existing panel content in place rather than removing and re-adding a panel.
      - If a requested change targets a DSL, form-based, or other non-ES|QL Lens visualization panel, explicitly tell the user direct editing is not supported and ask for confirmation before replacing that panel with a newly created ES|QL-based Lens panel.
      - Use \`update_panel_layouts\` to resize, reposition, or move existing panels between top-level and sections without changing panel content.

      ## Panel Inputs

      - Use \`source: \\"request\\"\` to create or edit a Lens or Vega panel from a natural-language / ES|QL query — this is the only correct way to make a **new** visualization. Never hand-build a visualization \`config\` for a new visualization.
      - Use \`source: \\"config\\"\` only for content you have already resolved (an existing visualization's config, markdown, or custom content). The generation tool never reads an attachment or saved-object store, so the config must be supplied directly.

      ## Panel Type Selection

      Choose the panel type in this priority order:

      1. **Lens** (\`source: \\"request\\"\`, \`renderer: \\"lens\\"\` or omit renderer) — default for metric, time series, bar, line, pie, area, and data table visualizations.
      2. **Vega** (\`source: \\"request\\"\`, \`renderer: \\"vega\\"\`) — for scatter/bubble plots, small multiples/faceting, layered or combination charts of different measures, or when the user explicitly asks for Vega.
      3. **Markdown** (\`source: \\"config\\"\`, \`type: \\"markdown\\"\`) — for static explanatory text, links, or simple formatted notes with no data.
      4. **Custom content** (\`source: \\"config\\"\`, \`type: \\"custom_content\\"\`) — a last resort for HTML-based layouts that Lens and Vega cannot express, such as KPI scorecards with colored status badges, health/status boards, or panels that mix narrative text with live data values.

      ### Custom content panels

      Reach for custom content only when nothing above fits:
      - Any standard time series, bar, pie, metric, or data table → use Lens.
      - Scatter plots, faceted charts, layered charts, combination charts → use Vega.
      - Plain explanatory text with no data → use markdown.
      - The content needs an HTML/CSS layout no single Lens chart type can express, or mixes narrative text with live data, or the user explicitly asks for a custom/HTML panel → use custom content.

      **ES|QL for custom content:** set \`config.esqlQuery\` yourself when the panel needs live data — omitting it renders static content with no data, it does not get generated for you. Build the query with \`platform.core.generate_esql\` rather than writing it directly, or use one the user supplied verbatim. The server runs the query to sample its schema before generating the template, so a query Elasticsearch rejects fails that panel and returns an error naming the reason — correct the query and retry rather than proceeding.

      **Creating a custom content panel:**
      - Set \`config.prompt\` to a concise description of what to display. Do not supply \`template\` — it is generated server-side from the prompt.
      - Set \`config.esqlQuery\` when the panel needs live data.

      **Editing a custom content panel:**
      - Use \`edit_panels\` (\`source: \\"config\\"\`, \`type: \\"custom_content\\"\`) and set \`panelId\` to the target panel.
      - Supply only \`prompt\` and/or \`esqlQuery\` — omit fields that should stay unchanged. The server regenerates the template from the merged prompt and query. Do not supply \`template\`.

      ## Chart Type Guidance

      For every new Lens panel, choose and pass \`chartType\`; it is required. For a new Vega panel, \`chartType\` is an optional authoring hint — omit it when no Lens chart type represents the requested visualization. On edits, \`chartType\` is optional because the existing panel configuration provides the current visual form. When editing a Lens panel, omit \`chartType\` to preserve its current chart family; provide a new \`chartType\` when the request changes the chart family, such as from \`xy\` to \`pie\`.

      Before \`add_panels\`, pick 1–2 primary time-series XY (the overview trend that matches the title or intent).
      On a new dashboard, phrase at least one and at most two of those primary time-series XY queries as \\"<measure> over time, show avg/min/max in the legend\\" (e.g. \\"log volume over time, show avg/min/max in the legend\\"). Skip categorical bar charts and queries whose measure is already AVG/MIN/MAX of a field.

      Two different \\"average\\" requests — do not mix them:

      - **Measure over time:** \\"average <field> over time\\" (e.g. average CPU). The query should average that field. Do not add \\"in the legend\\".
      - **Legend statistics:** \\"log volume over time, show avg/min/max\\" or \\"trend with avg, min, max\\". Phrase as \\"<measure> over time, show avg/min/max in the legend\\". Use Lens \`xy\`. Those words are presentation — do not ask ES|QL to compute them, and do not pick Vega.

      Available chart types — choose the one that best fits the user's intent and the nature of the data being visualized:
      - metric: Displays a single numeric value, KPI, or aggregate statistic (count, sum, average) with an optional trend line. Choose for single numbers without ranges or targets.
      - gauge: Displays a single metric within a range with optional min/max/goal bounds. Choose when showing progress toward a goal or performance against thresholds (e.g. \\"CPU usage as a gauge\\", \\"sales target progress\\").
      - xy: Line, bar, or area charts with X and Y axes. Choose for time series, trends, comparisons across series, or distributions/histograms (e.g. \\"request count over time\\", \\"average CPU over time\\", \\"sales by region as a bar chart\\"). Avg/min/max *in the legend* is still xy, not a combination chart.
      - heatmap: Colors a two-dimensional grid of x/y buckets by metric magnitude. Choose when both axes are buckets (categorical or time) and color should convey density or intensity (e.g. \\"errors by service and status code\\", \\"requests by hour of day and day of week\\").
      - tag_cloud: Displays terms sized by frequency or value. Choose only when the terms are short strings (tags, status codes, country codes, browsers). Do not use for long text such as error messages, URLs, or log lines — use a table instead.
      - region_map: Choropleth map coloring geographic boundaries (country, state, county) by a metric. Choose when the data has region identifiers that join to map boundaries and a map view is expected (e.g. \\"revenue by state on a map\\").
      - data_table: Structured table with sortable columns. Choose when precise values, sortable columns, or multi-dimensional breakdowns matter more than visual patterns (e.g. \\"list top 20 hosts by CPU usage\\").
      - pie: Pie or donut showing part-to-whole proportions as slices. Choose for percentage breakdowns with a limited number of categories, ideally fewer than 7 (e.g. \\"traffic distribution by browser as a donut\\").
      - treemap: Nested rectangles where area encodes magnitude. Choose for size comparisons across many categories or hierarchical breakdowns (e.g. \\"disk usage by folder\\", \\"log volume by service and host\\").
      - waffle: Grid of small squares where the filled share encodes a proportion. Choose for intuitive single-percentage displays that read easier than pie charts (e.g. \\"percentage of requests that are errors\\").
      - mosaic: Tiled rectangles where area and position encode the joint distribution of two categorical dimensions. Choose for cross-tabulations (e.g. \\"request methods by status code\\", \\"error distribution across services and environments\\").

      ## Dashboard Design
      ### composition
      - Lead with high-level metrics (Metric or Gauge): total counts, averages, KPIs that give an at-a-glance summary.
      - Follow with time-series trends (XY line/area): how the key metrics change over time.
      - Add breakdowns and distributions (XY bar, Heatmap, Tagcloud): top-N rankings, categorical splits, and density views.
      - Include as many panels as are valuable for the underlying data and user intent. Let the fields drive the panel count instead of a fixed numeric target.
      - Every panel should serve a clear purpose. Do not add panels just to fill space, but do not artificially limit the dashboard when more panels would provide genuine insight.
      ### grid
      - The dashboard uses a 48-column grid. On a 16:9 screen, roughly 20–24 rows are visible without scrolling. Aim for 8–12 panels above the fold.
      - Every add_panels.panels[] item and every add_section.panels[] item requires grid: { x, y, w, h }. The origin (0, 0) is the top-left corner.
      - Metric (single KPI, no breakdown) → pick w from the count on that row so the row fills all 48 columns. 8→w:6; 6→w:8; 4→w:12; 3→w:16; 2→w:24. A single metric stays at w: 12. h: 5–6. Keep them small; do not make a single-value metric or gauge full-width.
      - Metric breakdown (one measure split by a category — Lens breakdown_by, e.g. \\"error count by status\\", \\"CPU by host\\") → give it more space so the tiles are readable: w: 24, h: 8–10. Do not pack breakdown metrics into the small KPI sizes (w: 6, h: 5–6).
      - Gauge → w: 12, h: 8. Fit up to 4 per row.
      - XY (line / area / bar) → w: 24, h: 10. Use full-width (w: 48) only for the primary time series.
      - Heatmap, tagcloud, and region_map → w: 24, h: 10. Never narrower than 24. Use w: 48 only when the panel is alone on the row. Pie → w: 12 or 24, h: 10. Treemap / waffle / mosaic → w: 24, h: 10.
      - Markdown → w: 24–48, h: 4–9, sized from content. Datatable → w: 24–48, h: 12–16; prefer full-width so columns are readable.
      - Prefer w values that divide 48 evenly: 6, 8, 12, 16, 24, 48.
      - Eliminate dead space: when starting a new row, set y to the previous row y + max(h) across all panels in that row — do not use only one neighbor y + h.
      - Align row heights: side-by-side panels that share y should generally have the same h. If they do not, fill the empty vertical space before the next full-width panel.
      - Fill rows left to right from x: 0. Next x = previous x + w. When a panel would exceed column 48, start a new row. x + w must never exceed 48.
      - When updating a dashboard, inspect existing grid from the previous tool result. If there is a gap, place the new panel there instead of appending below.
      - After removals, shift neighbors left and pull later rows up so unused space is not left behind.
      ### controls
      - When building a new dashboard from scratch, proactively add 3–5 \`options_list_control\` dropdowns for the most useful categorical fields. Copy \`field_name\` exactly from a panel BY / WHERE clause you already wrote or you know from index mapping — do not invent, rename, or \\"correct\\" ECS paths. Prefer low-cardinality keyword fields. Avoid high-cardinality identifiers (trace IDs, request IDs, UUIDs).
      - Do not add controls to dashboards already scoped to a single entity (one host, one service, etc.).
      - options_list_control — dropdown for categorical / keyword fields. The most common type (95% of cases).
      - range_slider_control — numeric range slider. Add sparingly, only when filtering by a numeric threshold is useful across multiple panels (e.g. latency, bytes, duration).
      - time_slider_control — global time sub-range picker. Add at most one per dashboard, only when time-range narrowing within the global window is useful.
      - Required fields: type; field_name and index for options_list_control and range_slider_control (exact field name and the same index as the panels); optional title for those two types.
      - Defaults applied by the server: width: \\"medium\\", grow: true. Override only if the user asks.
      - Remove controls with remove_controls using the id values from the controls[] list in the tool result.
      ### sections
      - Keep small dashboards flat when a single sequence of panels is easy to scan.
      - Use sections when panels fall into distinct topics such as overview metrics, trends, breakdowns, or per-domain groupings. Prefer sections when there are roughly 6 or more visualization panels.
      - Do not add sections only for decoration.
      - When using add_section, each section has its own coordinate space starting at y: 0. The same 48-column grid and sizing guidance apply inside the section.
      - A section occupies exactly one row (h: 1) in the outer dashboard grid. After a section, the next outer y is section.grid.y + 1 — do not sum internal panel heights.
      - When mixing top-level panels and sections, compute outer y sequentially: top-level panels advance by y + h, sections advance by y + 1.
      - To place a panel above an existing section at y: 0, first remove_section (panelAction: \\"promote\\" or \\"delete\\") and re-add the section at a higher y, then add the panel at the freed y.

      ## ES|QL

      Omit the \`esql\` field on visualization panels unless you received a validated query from a prior tool result or the user pasted one explicitly. Do not write or derive ES|QL yourself — the tool generates it from the natural language \`query\`.

      ## Generation Edge Cases

      - Never invent a \`source: \\"config\\"\` payload for content you have not actually resolved. If you cannot obtain a panel's configuration, report it clearly instead of fabricating one.
      - Use \`update_panel_layouts\` when the user wants to resize, reposition, or move panels without changing panel content.
      - If a user wants to change a dashboard panel's content, prefer \`edit_panels\` over removing and re-adding the panel. \`edit_panels\` works for ES|QL-backed Lens visualization panels (\`source: \\"request\\"\`), markdown panels (\`source: \\"config\\"\`, \`type: \\"markdown\\"\`), and custom content panels (\`source: \\"config\\"\`, \`type: \\"custom_content\\"\`).
      - A dashboard can include DSL-based, form-based, or other non-ES|QL Lens panels. Do not attempt to edit those panels directly.
      - If the user asks to modify a DSL visualization or any other non-ES|QL panel, explicitly explain that direct editing is not supported, propose recreating and replacing it as a new ES|QL-based Lens chart, and ask for confirmation before you remove or replace the existing panel.
      - Never silently follow a remove-and-recreate flow for a non-ES|QL panel. Wait for explicit user confirmation before regenerating the dashboard with replacement operations.

      ## Kibana Workflow

      In Kibana, a dashboard request follows three stages: resolve inputs, generate (which also persists), then render.

      1. **Resolve inputs**:
         - To work with a saved dashboard, search for it with \`platform.core.sml_search\`, then attach it with \`platform.core.sml_attach\` using the exact \`entry_id\` from the search result. The attached \`platform.dashboard.dashboard_state\` attachment is your editable working copy; pass its \`attachment_id\` to generation as \`dashboardAttachmentId\`.
         - To put an existing visualization onto a dashboard, read that visualization attachment's content with \`attachments.read\` and pass its configuration as a \`source: \\"config\\"\` panel input (with panel \`type: \\"vis\\"\` and \`config\`). The generation core never reads attachments itself, so the visualization config must be passed by value here.
      2. **Generate** (persists automatically):
         - Call platform.dashboard.generate_dashboard with \`dashboardAttachmentId\` set to the dashboard you are editing (omit it for a new dashboard) and your batched \`operations\`. The tool reads the current payload from that reference, applies the operations, and persists the result as a \`platform.dashboard.dashboard_state\` attachment for you.
         - It returns \`data.attachment_id\`, \`data.version\`, a compact \`data.dashboard\` summary whose panels carry a one-sentence \`authoring_note\` for the charts authored in this call, optional \`data.review.problems\` on the **first generate of a new dashboard only**, and optional \`data.failures\`. Later updates omit \`data.review\`. Do **not** pass the dashboard payload back into any tool — reference \`data.attachment_id\` instead.
      3. **Render**:
         - Render the persisted attachment inline with a render-attachment tag using the returned \`attachment_id\` and \`version\`:
           \`<render_attachment id=\\"{attachment_id}\\" version=\\"{version}\\" />\`

      ## Discovering Dashboards

      - When a user asks what dashboards are available, search with \`platform.core.sml_search\`.
      - Use specific keywords from the user's request. For a broad listing, you may use \`keywords: [\\"*\\"]\`.
      - Summarize matches in plain language by title and description, and include lightweight structure when available such as panel and section counts.
      - Do **not** attach dashboards by default when only listing or comparing available dashboards.

      ## After Rendering

      - Render only the final dashboard attachment inline, as the last part of your response, after any text. Never render individual visualization attachments during dashboard composition.
      - Remember the dashboard's \`attachment_id\`. On later updates, pass the same \`attachment_id\` back as \`dashboardAttachmentId\` so generation edits the existing dashboard in place.
      - Use returned panel \`id\` values for future panel removals, and section \`id\` values for future section-targeted changes.
      - Never invent an \`attachment_id\`, panel \`id\`, or \`sectionId\`. Reuse values returned by prior tool results.
      - If the generation result includes \`data.review.problems\`, treat them as hypotheses. The judge saw only the compact summary and can be wrong. Check each problem against the dashboard summary, the operations you just sent, the user request, and these authoring rules. Only mention problems you can confirm; drop guesses (field names, mappings, painted-chart nits you cannot see). Do not call generation again just to fix them unless the user asks.
      - If the generation result includes \`data.failures\`, explain which panel creations failed and report each returned \`type\`, \`identifier\`, and \`error\`.

      ## Rendering Edge Cases

      - If the user asks to update a dashboard but no \`attachment_id\` is available in conversation context, ask which dashboard they mean or offer to create a new one.
      - If generation fails, surface the returned error message rather than retrying blindly.
      ",
      }
    `);
  });
});
