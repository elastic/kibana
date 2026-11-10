/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  getChartTypeSelectionPromptContent,
  seriesStatisticsAgentGuidance,
} from '@kbn/agent-builder-visualizations-server';
import { getInlinePanelKindGuidance, getPanelTypeSelection } from '@kbn/dashboard-agent-authoring';
import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';
import { dashboardDesignGuidancePrompt } from './design';
import { ENHANCE_GUIDANCE_PATH, enhanceGuidanceReference } from './enhance_guidance';
import { panelConfigReferenceGuidance, panelConfigReferences } from './panel_config_references';

const chartTypeSelectionGuidance = getChartTypeSelectionPromptContent();
const panelTypeSelection = getPanelTypeSelection();
const inlinePanelKindGuidance = getInlinePanelKindGuidance();

const guidance = `## Dashboard Changes

The ${dashboardTools.generateDashboard} tool applies the changes you describe to the current dashboard (if any). Describe the desired result, keyed by id, rather than steps: \`title\`, \`description\`, and \`time_range\` for dashboard fields, \`sections\`, \`panels\` and \`controls\` to create or update, and \`remove\` for ids to delete. Everything you leave out stays unchanged. See the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

## Improving an Existing Dashboard (Enhance)

When asked to enhance, improve, or clean up an existing dashboard, read \`${ENHANCE_GUIDANCE_PATH}\` with \`read_file\` before inspecting the dashboard or calling any other tool. Follow that file. It takes precedence over the create-dashboard guidance in this skill. Do not enhance without reading it.

## Describing Changes

The tool schema describes each field. The rules below cover what the schema cannot express.

Make all changes in a single ${dashboardTools.generateDashboard} call whenever possible. The tool checks each change against the dashboard as it was before the call and against the rest of the call, then applies the changes one by one: failed ones are listed in \`failures\` and the rest are kept. Place panels in a new section in the same call that creates it.

For a new dashboard, set both \`title\` and \`description\`.

For an existing dashboard:
- Edit a panel by its id with \`content\` of the same kind rather than removing and re-adding it. Reorganizing or enhancing a dashboard does not require replacing panels. Edits work for ES|QL Lens, ES|QL Vega, custom content, markdown, and ML anomaly panels, with the \`type\` of the panel's kind.
- For focused edits, pass only the requested change in the \`query\` (e.g. "make the error series blue"). The chart author preserves unrelated presentation settings.
- These panels cannot be edited, only moved, resized, or removed: DSL-based, form-based, and other non-ES|QL Lens panels, Vega panels whose spec reads data other than one top-level ES|QL \`data.url\` (\`%type%: esql\`, with no \`format\` or other url options), such as an Elasticsearch query, a map file, inline values, or several sources, and by-reference panels (\`config.savedObjectId\` or \`config.ref_id\`). A by-reference panel's content is unknown: do not look it up with any tool or API; its title is the only hint. When the user asks to change one of these panels, say so, propose replacing it with a new ES|QL-based panel of the same kind (Lens for Lens, Vega for Vega), and wait for explicit confirmation before replacing it.

## Panel Inputs

Each visualization request is authored in a separate context. New-panel authors do not see the dashboard attachment or other panels, so for Lens, Vega, and custom content panels with \`hasData: true\` pass the exact known \`index\` and describe the measure, fields, and filters in \`query\`. Omit \`index\` only when the source is unknown and discovery is needed. Never write a custom content panel's \`esql\` yourself (see Custom Content Panels). Edits of existing panels receive the original configuration and queries automatically through the panel id.

- Lens, Vega, and custom content panels (\`type: "vis"\`, \`"vega"\` or \`"custom_content"\`) are generated server-side from a natural-language \`query\` — this is the only way to make a **new** generated panel.
- Use \`type: "attachment"\` to place a visualization that \`${platformCoreTools.createVisualization}\` already returned in this conversation. A generated panel would be a **new**, different panel instead.
- Markdown and ML anomaly panels are authored by value, with their \`type\` and \`config\`. ${panelConfigReferenceGuidance}

## Panel Type Selection

Choose the first panel type that fits:

${panelTypeSelection}

${inlinePanelKindGuidance}

Other panel types never take \`esql\` unless it came from \`${platformCoreTools.generateEsql}\` or the user pasted it: their query is generated from \`query\`.

## Chart Type Guidance

Before adding panels, pick 1–2 primary time-series XY (the overview trend that matches the title or intent).
On a new dashboard, phrase at least one and at most two of those primary time-series XY queries as "<measure> over time, show avg/min/max in the legend" (e.g. "log volume over time, show avg/min/max in the legend"). Skip categorical bar charts and queries whose measure is already AVG/MIN/MAX of a field.

${seriesStatisticsAgentGuidance}

${chartTypeSelectionGuidance}

${dashboardDesignGuidancePrompt}

## Controls

Controls are interactive filters pinned above the dashboard that let users explore data without editing queries.

**When building a new dashboard from scratch**, proactively add 3–5 \`options_list_control\` dropdowns for the most useful categorical fields. Pick fields that appear in panel \`BY\` / \`WHERE\` clauses, prefer low-cardinality keyword fields (e.g. \`service.name\`, \`host.name\`, \`env\`, \`region\`, \`kubernetes.namespace\`, \`http.response.status_code\`). Avoid high-cardinality identifiers (trace IDs, request IDs, UUIDs). Add a \`range_slider_control\` only when filtering by a numeric threshold is useful across multiple panels.

Do not add controls to dashboards already scoped to a single entity (one host, one service, etc.).

Controls query the index directly, so columns created in ES|QL (\`DISSECT\`, \`GROK\`, \`EVAL\`, \`RENAME\`) cannot back a control. Controls are optional: when no mapped field fits, add fewer controls or none.

Controls are keyed by the \`id\` from the \`controls[]\` list in the tool result. To change a control, send its full new definition with that \`id\`; to remove it, list the \`id\` in \`remove\`.`;

/**
 * Environment-agnostic dashboard *generation* guidance.
 *
 * The `guidance` describes how to build a dashboard, including the detailed design guidance
 * (composition + panel layout) inlined directly. It deliberately says nothing about how the
 * current dashboard is referenced or how the result is returned/surfaced. Those are
 * environment-specific and avoided here so the block can be reused across environments. Pair it with
 * an environment-specific rendering guidance block (e.g. the Kibana one) that explains how the
 * generated dashboard is surfaced.
 */
export const dashboardGeneration: DashboardGuidanceModule = {
  guidance,
  referencedContent: [enhanceGuidanceReference, ...panelConfigReferences],
};
