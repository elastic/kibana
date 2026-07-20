/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rawVegaChartTypes } from './chart_type_registry';

/** "sunburst / hierarchy, radar / spider, sankey / flow" */
export const formatRawVegaAllowlist = (): string =>
  rawVegaChartTypes.map((entry) => entry.chartLabel).join(', ');

/** Compact form for short skill/tool blurbs: "sunburst/hierarchy, radar/spider, …" */
export const formatRawVegaAllowlistCompact = (): string =>
  rawVegaChartTypes.map((entry) => entry.chartLabel.replace(/ \/ /g, '/')).join(', ');

/** Catalog ids for query wording hints: "sunburst, radar, sankey" */
export const formatRawVegaCatalogIds = (): string =>
  rawVegaChartTypes.map((entry) => entry.id).join(', ');

/** Bold markdown list of allowlisted chart labels. */
export const formatRawVegaAllowlistBold = (): string =>
  rawVegaChartTypes.map((entry) => `**${entry.chartLabel}**`).join(', ');

/**
 * Shared Vega renderer scope for agent skills / tool descriptions.
 * Keep in sync with the Raw Vega chart type registry allowlist.
 */
export const VEGA_SCOPE_AGENT_GUIDANCE = `**Scope — Vega-Lite plus allowlisted Raw Vega.** The Vega renderer authors Vega-Lite by default. It also supports allowlisted Raw Vega charts (currently ${formatRawVegaAllowlistBold()}). It does **not** yet support other Raw Vega diagrams such as network / force or chord, nor custom signals / Kibana filter interactivity. If a request fits neither Lens, Vega-Lite, nor an allowlisted Raw Vega chart, do **not** force a broken or misleading chart. Be honest with the user: explain what is not supported yet, then offer alternatives — the closest Vega-Lite approximation, a standard Lens chart, or splitting the request into multiple charts — and ask how they would like to proceed.`;

/** Hard rule: never bypass create_visualization / request panels with hand-authored JSON. */
export const NEVER_HAND_AUTHOR_VEGA_GUIDANCE =
  'Do NOT hand-author Vega/Vega-Lite JSON. Do NOT persist charts with attachments.add.';

/**
 * When to pass `renderer: "vega"` (skills, tool descriptions, dashboard schema).
 * VL examples Lens cannot express + allowlisted Raw Vega families.
 */
export const RENDERER_VEGA_WHEN_GUIDANCE = `Pass \`renderer: "vega"\` when the user asks for Vega/Vega-Lite, or when no Lens type fits — e.g. small multiples/faceting, layered or combination charts, scatter/bubble with size, allowlisted Raw Vega (${formatRawVegaAllowlist()}), or custom encodings. Required for ${formatRawVegaCatalogIds()} — do not omit. The tool selects Vega-Lite vs allowlisted Raw Vega from the query. Edits keep the existing renderer.`;

/** Short schema-friendly renderer hint. */
export const RENDERER_VEGA_SCHEMA_DESCRIBE = `(optional) "lens" (default) or "vega". ${RENDERER_VEGA_WHEN_GUIDANCE}`;

/** ES|QL generate/execute tools are grounding only — not a chart authoring path. */
export const ESQL_TOOLS_GROUNDING_ONLY_GUIDANCE =
  'Do not substitute generate_esql + execute_esql for visualization creation (grounding only).';

/** Ground index/fields before create_visualization or dashboard request panels. */
export const GROUND_INDEX_AGENT_GUIDANCE =
  'Ground the target index and confirm every referenced field exists in its mapping before creating visualizations. Omitting `index` forces auto-discovery, which fails when fields are invented or absent. For multi-panel requests, resolve the index once and reuse it.';

/**
 * Dashboard: new vis panels via request (not create_visualization → config).
 */
export const DASHBOARD_NEW_VIS_PANEL_GUIDANCE = `- Use \`source: "request"\` to create or edit a **new** visualization panel from a natural-language query. This is the only correct path for new dashboard panels — Lens **and** Vega (including ${formatRawVegaAllowlist()}). Never hand-build a \`config\` for a new visualization, and never call create_visualization just to feed a dashboard panel.
- For Vega-family panels (${formatRawVegaAllowlist()}), pass \`renderer: "vega"\` on the \`source: "request"\` item (and include the chart word — ${formatRawVegaCatalogIds()} — in \`query\` when that is what the user asked for). Omit \`renderer\` (or use \`"lens"\`) for ordinary Lens charts.`;

/** Omit agent-authored ES|QL on dashboard panels. */
export const DASHBOARD_OMIT_ESQL_GUIDANCE =
  'Omit `esql` on visualization panels unless you already have a validated query from a prior tool result or the user pasted one. Do not write or invent ES|QL — the tool generates it from the natural-language `query`.';

/** Verbatim Vega spec when reusing an attachment via source:config. */
export const DASHBOARD_VEGA_CONFIG_VERBATIM_GUIDANCE =
  'If you must reuse an existing Vega visualization attachment via `source: "config"`, pass `config: { "spec": "<verbatim visualization.spec>" }` — copy the string character-for-character; never double-encode, re-stringify, or rewrite Vega expressions.';

/**
 * Full Panel Inputs block for dashboard generation guidance (request + esql + config).
 */
export const DASHBOARD_PANEL_INPUTS_GUIDANCE = `${DASHBOARD_NEW_VIS_PANEL_GUIDANCE}
- ${GROUND_INDEX_AGENT_GUIDANCE} Put \`index\` on each \`source: "request"\` panel.
- ${DASHBOARD_OMIT_ESQL_GUIDANCE}
- Use \`source: "config"\` only for content you have **already** resolved earlier (an existing visualization attachment you must reuse, or markdown). Prefer \`source: "request"\` for anything new. The generation tool never reads an attachment store, so a \`config\` payload must be supplied by value.
- ${DASHBOARD_VEGA_CONFIG_VERBATIM_GUIDANCE}`;

/** Schema describe for by-value Vega/Lens config on dashboard panels. */
export const DASHBOARD_VIS_CONFIG_SCHEMA_DESCRIBE =
  'Already-resolved visualization config from a visualization attachment\'s `visualization` field: Lens API config (top-level `type`) or Vega `{ spec }`. For Vega, copy `visualization.spec` verbatim — never re-stringify/double-encode or rewrite expressions. Do not hand-build a config for a new visualization — use source: "request" instead.';

/** Schema describe for optional panel esql. */
export const DASHBOARD_PANEL_ESQL_SCHEMA_DESCRIBE = `(optional) ${DASHBOARD_OMIT_ESQL_GUIDANCE}`;

/** Viz skill: send dashboard work to dashboard-management. */
export const VIZ_SKILL_DEFER_DASHBOARD_GUIDANCE = `The user wants a **dashboard** (create one, or add/edit panels on one) — even if the panels are Vega / ${formatRawVegaCatalogIds()}. Load **dashboard-management** and create panels with \`source: "request"\` (\`renderer: "vega"\` when needed). Do **not** call create_visualization and then copy the spec into the dashboard.`;

/** Dashboard skill: send standalone charts to visualization-creation. */
export const DASHBOARD_SKILL_DEFER_STANDALONE_GUIDANCE =
  'The user asks for a **standalone** visualization (no dashboard mentioned). Use the visualization-creation skill instead.';
