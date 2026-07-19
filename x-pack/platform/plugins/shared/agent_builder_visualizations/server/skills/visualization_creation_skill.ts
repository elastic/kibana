/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  ESQL_TOOLS_GROUNDING_ONLY_GUIDANCE,
  GROUND_INDEX_AGENT_GUIDANCE,
  NEVER_HAND_AUTHOR_VEGA_GUIDANCE,
  RENDERER_VEGA_WHEN_GUIDANCE,
  VEGA_SCOPE_AGENT_GUIDANCE,
  VIZ_SKILL_DEFER_DASHBOARD_GUIDANCE,
  formatRawVegaAllowlist,
  formatRawVegaAllowlistCompact,
  formatRawVegaCatalogIds,
  getChartTypeSelectionPromptContent,
} from '@kbn/agent-builder-visualizations-server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

const chartTypeSelectionContent = getChartTypeSelectionPromptContent();
const rawVegaAllowlist = formatRawVegaAllowlist();
const rawVegaAllowlistCompact = formatRawVegaAllowlistCompact();
const rawVegaCatalogIds = formatRawVegaCatalogIds();

export const visualizationCreationSkill = defineSkillType({
  id: 'visualization-creation',
  name: 'visualization-creation',
  basePath: 'skills/platform/visualization',
  description: `Create standalone Lens or Vega visualizations (including Raw Vega ${rawVegaAllowlistCompact}) via create_visualization. For dashboards, use dashboard-management instead. ${NEVER_HAND_AUTHOR_VEGA_GUIDANCE}`,
  content: `## When to Use This Skill

Use this skill when:
- A user asks for one or more **standalone** visualizations (chart, metric, trend, breakdown, distribution) with **no dashboard** in the request.
- A user asks for a standalone **Vega**, **Vega-Lite**, or allowlisted Raw Vega chart (${rawVegaAllowlist}) (again: no dashboard).
- You explicitly want a reusable visualization attachment ID for later use outside a dashboard.
- A user asks to update an existing visualization by attachment ID.

Do **not** use this skill when:
- The user only needs raw documents or table/query output without a visualization.
- The user first needs broad data discovery and exploration across unknown sources.
- The request is about persisted saved objects instead of in-memory attachment workflows.
- ${VIZ_SKILL_DEFER_DASHBOARD_GUIDANCE}

## Hard Rules (do not violate)

- **Always** create charts with **${
    platformCoreTools.createVisualization
  }**. That tool authors, validates, and stores the visualization attachment.
- ${RENDERER_VEGA_WHEN_GUIDANCE}
- ${NEVER_HAND_AUTHOR_VEGA_GUIDANCE}
- ${ESQL_TOOLS_GROUNDING_ONLY_GUIDANCE} At most, use generate_esql / execute_esql to ground fields; then still call ${
    platformCoreTools.createVisualization
  } with the natural-language \`query\` (and optional \`esql\` only when you must).

## Available Tools

- **${
    platformCoreTools.createVisualization
  }**: Create or update visualization configurations and return \`attachment_id\` when persistence succeeds. It generates and validates the ES|QL and the Lens/Vega spec internally from your natural-language \`query\`.
- **${
    platformCoreTools.generateEsql
  }**: Optional. Only for genuinely complex aggregations/joins you want to control precisely; pass the result to ${
    platformCoreTools.createVisualization
  } via \`esql\`. Not a required step before every visualization.
- **${
    platformCoreTools.executeEsql
  }**: Validate ES|QL and inspect sample result shape (grounding only).

## Visualization Creation Workflow

1. **Ground the index and fields FIRST (required)**
   - ${GROUND_INDEX_AGENT_GUIDANCE}
   - If not already grounded, list indices and inspect the mapping (optionally probe with ${
     platformCoreTools.executeEsql
   }). Never invent field names or assume a domain schema (APM, metrics, etc.) is present.

2. **Prepare visualization intent**
   - Default: pass the natural-language \`query\` to ${
     platformCoreTools.createVisualization
   } (including ${rawVegaCatalogIds}) — do **not** call ${
    platformCoreTools.generateEsql
  } first just to build a query.
   - Only for genuinely complex aggregations/joins: pre-generate with ${
     platformCoreTools.generateEsql
   }, optionally validate with ${platformCoreTools.executeEsql}, then pass \`esql\`.

3. **Call ${platformCoreTools.createVisualization}**
   - Provide \`query\` (include chart words like ${rawVegaCatalogIds} when asked), \`index\` (strongly recommended), \`renderer\` / \`chartType\` / \`esql\` / \`attachment_id\` as needed.
   - For multi-panel requests, resolve the index once, then call once per panel WITH that \`index\`.

4. **Interpret output and preserve artifacts**
   - Save \`data.attachment_id\` and \`data.version\` for rendering and later updates.
   - If the user later asks for a **dashboard**, switch skills: ${VIZ_SKILL_DEFER_DASHBOARD_GUIDANCE}

## Inline Rendering Guidelines

Render a created visualization by referencing its persisted attachment, using the \`attachment_id\` and \`version\` returned by ${
    platformCoreTools.createVisualization
  }:

\`\`\`
<render_attachment id="{attachment_id}" version="{version}" />
\`\`\`

- This renders both Lens and Vega visualizations. Copy \`attachment_id\` and \`version\` verbatim from the tool result; never invent them.
- Do **NOT** use the \`<visualization>\` element for ${
    platformCoreTools.createVisualization
  } output — that element is only for \`esql_results\` from \`${platformCoreTools.executeEsql}\`.
- **Standalone visualizations** (the user directly asked for a chart): render the attachment inline so the user can see and interact with it immediately.
- **Intermediate reusable artifacts** for a later workflow: do NOT render inline unless the user asked to inspect them. Only the final composed artifact should be rendered, to avoid cluttering the conversation.

## Writing Effective Visualization Prompts

Reference only fields that exist in your grounded index mapping. The field names below are illustrative — substitute the real fields from the index you resolved.

Good prompt patterns (specific and field-accurate):
- "Show average <numeric field> over time grouped by <keyword field>"
- "Display top 10 <keyword field> values by document count as a bar chart"
- "Show a single metric for count where <field> is <value>"
- "Create a Vega sankey of counts from <source field> to <dest field>"
- "Create a Vega sunburst of <hierarchy fields>"
- "Create a Vega radar of <category field> by count"
  (same pattern for any allowlisted Raw Vega chart: ${rawVegaAllowlist})

Poor prompt patterns:
- "Show CPU" / "Make a chart" / "Display everything" (too vague)
- Prompts naming fields you have not confirmed exist
- Hand-writing Vega JSON after generate_esql / execute_esql instead of calling ${
    platformCoreTools.createVisualization
  }

Always reference real fields from the index mapping.

## Choosing the Renderer

${
  platformCoreTools.createVisualization
} renders with **Lens** (standard charts) or **Vega** (Vega-Lite, plus allowlisted Raw Vega).

- ${RENDERER_VEGA_WHEN_GUIDANCE}
- Otherwise pass \`renderer: "lens"\` (the default when omitted) with the best-fitting \`chartType\`.

${VEGA_SCOPE_AGENT_GUIDANCE}

## Chart Type Guidance

Supported values for \`chartType\`: ${Object.values(SupportedChartType).join(', ')}.

${chartTypeSelectionContent}

When uncertain, omit \`chartType\` and let ${
    platformCoreTools.createVisualization
  } infer the best type from the request.

## Edge Cases

- **Requested field missing:** suggest nearest valid fields from the index mapping.
- **ES|QL returns no data:** explain and suggest broader time range/filters.
- **Unsupported chart request:** pick closest supported type and explain the substitution (see Vega scope above for unsupported Raw Vega).
`,
  referencedContent: [
    {
      relativePath: './examples',
      name: 'create-visualization-requests',
      content: `# create_visualization Request Examples

## Create a new visualization

\`\`\`json
{
  "query": "Show average system.cpu.total.pct over time grouped by host.name",
  "index": "metrics-system.cpu-default",
  "chartType": "xy"
}
\`\`\`

## Create a Vega sankey (allowlisted Raw Vega)

After grounding the index/fields, call create_visualization directly — do not generate ES|QL or hand-write a Vega spec:

\`\`\`json
{
  "query": "Create a Vega sankey of flight counts from OriginCountry to DestCountry",
  "index": "kibana_sample_data_flights",
  "renderer": "vega"
}
\`\`\`

## Create a Vega sunburst or radar

\`\`\`json
{
  "query": "Create a Vega sunburst of flight counts from OriginCountry to DestCountry",
  "index": "kibana_sample_data_flights",
  "renderer": "vega"
}
\`\`\`

## Create using pre-generated ES|QL

\`\`\`json
{
  "query": "Top 10 source IPs by request count",
  "index": "logs-nginx.access-default",
  "esql": "FROM logs-nginx.access-default | STATS requests = COUNT(*) BY source.ip | SORT requests DESC | LIMIT 10"
}
\`\`\`

## Update an existing visualization attachment

\`\`\`json
{
  "attachment_id": "viz-attachment-123",
  "query": "Update this chart to show 95th percentile response bytes over time",
  "index": "logs-nginx.access-default",
  "chartType": "xy"
}
\`\`\`
`,
    },
  ],
  getRegistryTools: () => [
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
    platformCoreTools.createVisualization,
  ],
});
