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
 * Dashboard panel creation path for Vega-family charts (generation guidance).
 */
export const DASHBOARD_NEW_VIS_PANEL_GUIDANCE = `- Use \`source: "request"\` to create or edit a **new** visualization panel from a natural-language query. This is the only correct path for new dashboard panels — Lens **and** Vega (including ${formatRawVegaAllowlist()}). Never hand-build a \`config\` for a new visualization, and never call create_visualization just to feed a dashboard panel.
- For Vega-family panels (${formatRawVegaAllowlist()}), pass \`renderer: "vega"\` on the \`source: "request"\` item (and include the chart word — ${formatRawVegaCatalogIds()} — in \`query\` when that is what the user asked for). Omit \`renderer\` (or use \`"lens"\`) for ordinary Lens charts.`;
