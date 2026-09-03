/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { dashboardTools } from '../../../common';

export const whenToUse = `## When to use this skill

Use this skill when:
- A user asks to find, list, inspect, or modify existing Kibana dashboards.
- A user asks to create a dashboard from one or more visualizations.
- A user asks to update a dashboard created earlier in the conversation.
- A request involves dashboard metadata, markdown, panel, or section changes.
- A user asks to prettify or enhance an attached dashboard.

Do **not** use this skill when:
- The user asks for a standalone visualization and does not mention a dashboard context.
- The user needs help exploring data, fields, or query logic.`;

export const grounding = `## Grounding first

${dashboardTools.generateDashboard} builds the dashboard from the current dashboard (if any) plus a batched \`operations\` array. Batch related operations into one call.

Every dashboard needs a non-empty \`title\`. If the current title is empty, missing, or \`"User Dashboard"\`, start with \`set_metadata\` and invent a title from the contents.

For a new dashboard, start with \`set_metadata\` and pass both \`title\` and \`description\`. Include \`time_range\` only when the user named a specific window such as "last 7 days". Omit it otherwise. A data-aware default is applied automatically.

When the request is vague, explore indices and mappings first with \`${platformCoreTools.listIndices}\` and \`${platformCoreTools.getIndexMapping}\`. Use real field names from that mapping. Never invent an index or field.

Always pass \`index\` on \`add_panels\` request items and on \`add_controls\`.

Do not write ES|QL. Omit \`esql\` unless the user pasted a validated query.`;

export const addPanels = `## add_panels

Use \`add_panels\` to create panels. Prefer one batched operation.

For a new Lens panel, each request item needs:
- \`source: "request"\`
- \`key\` (client ref for \`set_layout\` in the same call)
- \`title\`
- \`query\` (natural language)
- \`index\`
- \`chartType\` (required). Pick it from the tool schema enum. Do not invent a type.
- optional \`intent\`, \`style_overrides\`, or \`style_request\`

Do not pass \`grid\`. Do not pass \`sectionId\`. Do not pass \`esql\` unless the user pasted a validated query.

Use \`source: "config"\` only for content you have already resolved (an existing visualization config, markdown, or custom content). Never invent a config payload.

Panel kinds, in priority order:
1. Lens (\`source: "request"\`, omit \`renderer\` or pass \`"lens"\`) for metrics, time series, bars, lines, pies, areas, and tables.
2. Vega (\`source: "request"\`, \`renderer: "vega"\`) only when the user asks for Vega or Lens cannot express the chart.
3. Markdown (\`source: "config"\`, \`type: "markdown"\`) for static notes with no data.
4. Custom content (\`source: "config"\`, \`type: "custom_content"\`) only when Lens, Vega, and markdown cannot express the layout.

For custom content, set \`config.prompt\` and omit \`template\`. Set \`config.esqlQuery\` only when the user pasted a validated query.

Lead with high-level metrics, then trends, then breakdowns. Add a markdown panel only when it adds context. Use as many panels as the fields and the request justify. Do not add filler panels.

Keep small dashboards flat. Group distinct topics with \`set_layout\` sections when the dashboard is large or the story splits.`;

export const setLayout = `## set_layout

You own reading order. You emit rows and sections of panel refs. Code owns coordinates. Do not compute them.

Pass panel \`key\` values from the same call, or panel ids from an earlier result. A ref may be a string, or \`{ ref, width }\` with \`width\` of \`full\`, \`half\`, \`third\`, \`quarter\`, \`sixth\`, \`eighth\`, or a number.

\`auto: true\` repacks panels in place. It never reorders. Do not combine \`auto\` with \`rows\` or \`sections\`.

At most one \`set_layout\` per call. The server applies it after the other operations.

Create a section by listing it under \`sections\` without \`ref\`. Give it a \`key\`, \`title\`, and \`rows\`. Mention an existing section by \`ref\` (id or key) to keep or rewrite it. List a section's panels in top-level \`rows\` to promote them. A section left empty is dropped. Sections you omit stay in place, in order, after the structure you declared.

Do not invent section ids. Use ids the tool returns.`;

export const controls = `## Controls

Add filters with \`add_controls\`. Remove them by id with \`remove_controls\`.

When building a new dashboard, add 3 to 5 \`options_list_control\` dropdowns for the most useful categorical fields. Prefer low-cardinality keyword fields that appear in the panels, such as \`service.name\`, \`host.name\`, \`env\`, \`region\`, \`kubernetes.namespace\`, or \`http.response.status_code\`. Avoid high-cardinality identifiers such as trace ids, request ids, and UUIDs.

Do not add controls when the dashboard is already scoped to a single entity.

Control types:
- \`options_list_control\` for categorical or keyword fields. This is the usual choice.
- \`range_slider_control\` for a numeric threshold that several panels share, such as latency or bytes. Use sparingly.
- \`time_slider_control\` for a time sub-range inside the global window. Add at most one.

Required fields:
- \`type\`
- \`field_name\` (not for \`time_slider_control\`)
- \`index\` (not for \`time_slider_control\`). Always pass \`index\`.
- \`title\` (optional on options_list and range_slider)

The server default is \`width: "medium"\` and \`grow: true\`. Override only if the user asks.

Remove controls with ids from the tool result \`controls[]\` list.`;

export const edits = `## Edits

Prefer \`edit_panels\` over remove-and-readd.

Presentation (query stays pinned):
\`edit_panels { panelId, title | hide_title | intent | style_overrides }\`

Data:
\`edit_panels { panelId, query, regenerate_query: true }\`

Chart family:
\`edit_panels { panelId, chartType }\`

A \`query\` without \`regenerate_query\` is a style request. The server treats it as \`style_request\`.

Always pass \`index\` on new request panels.

\`edit_panels\` also updates markdown and custom content. For custom content, pass only \`prompt\` and/or \`esqlQuery\`. Omit \`template\`.

DSL, form-based, and other non-ES|QL Lens panels accept presentation edits. Data edits and chart-family edits fail. Do not tell the user to recreate those panels as ES|QL unless they ask.

Never invent a \`source: "config"\` payload. If you cannot obtain a panel's configuration, say so.`;
