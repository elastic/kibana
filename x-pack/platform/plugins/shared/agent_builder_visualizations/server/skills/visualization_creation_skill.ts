/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartTypeSelectionPromptContent } from '@kbn/agent-builder-visualizations-server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

const chartTypeSelectionContent = getChartTypeSelectionPromptContent();

export const visualizationCreationSkill = defineSkillType({
  id: 'visualization-creation',
  name: 'visualization-creation',
  basePath: 'skills/platform/visualization',
  description:
    'Create standalone or reusable visualizations from grounded index and field context.',
  content: `## When to Use This Skill

Use this skill when:
- A user asks for one or more standalone visualizations (chart, metric, trend, breakdown, distribution).
- You explicitly want a reusable visualization attachment ID for later use.
- A user asks to update an existing visualization by attachment ID.

Do **not** use this skill when:
- The user only needs raw documents or table/query output without a visualization.
- The user first needs broad data discovery and exploration across unknown sources.
- The request is about persisted saved objects instead of in-memory attachment workflows.
- The primary goal is to compose or update a dashboard. Use the dashboard-management skill for dashboard panel creation and layout.

## Available Tools

- **${
    platformCoreTools.createVisualization
  }**: Create or update visualization configurations and return \`attachment_id\` when persistence succeeds. It generates and validates the ES|QL internally from your natural-language \`query\` — you do not need to build ES|QL yourself for the common case.
- **${
    platformCoreTools.generateEsql
  }**: Optional. Only for genuinely complex aggregations/joins you want to control and validate precisely; pass the result to ${
    platformCoreTools.createVisualization
  } via \`esql\`. Not a required step before every visualization.
- **${platformCoreTools.executeEsql}**: Validate ES|QL and inspect sample result shape.

## Visualization Creation Workflow

1. **Ground the index and fields FIRST (required)**
   - Before the first ${
     platformCoreTools.createVisualization
   } call, know the target index and confirm every field you reference exists in its mapping.
   - If the index and fields are already grounded in context, continue directly.
   - If not, discover them first: list indices and inspect the index mapping (optionally probe with ${
     platformCoreTools.executeEsql
   }). Always use real field names from the index mapping — never invent index or field names, and never assume a domain schema (APM, metrics, etc.) is present; verify against the actual cluster.
   - ${
     platformCoreTools.createVisualization
   } auto-discovers an index only when you omit \`index\`, and that discovery FAILS when the referenced fields do not exist in any index. Guessing fields and relying on auto-discovery is the most common cause of failures — ground first.

2. **Prepare visualization intent**
   - Default path: pass the natural-language \`query\` to ${
     platformCoreTools.createVisualization
   } and let it generate the ES|QL. This is the right choice for almost every request — do **not** call ${
    platformCoreTools.generateEsql
  } first just to build a query.
   - Only for genuinely complex aggregations or joins you want to control precisely: pre-generate with ${
     platformCoreTools.generateEsql
   }, optionally validate the shape with ${platformCoreTools.executeEsql}, then hand the query to ${
    platformCoreTools.createVisualization
  } via \`esql\`.

3. **Call ${platformCoreTools.createVisualization}**
   - Provide:
     - \`query\` (required, specific and field-accurate)
     - \`index\` (strongly recommended — pass the grounded index; omitting it forces auto-discovery, which fails for ungrounded/invented fields)
     - \`renderer\` (\`lens\` or \`vega\`, optional — see "Choosing the Renderer"; omit to default to Lens)
     - \`chartType\` (optional, only if confident)
     - \`esql\` (optional, when you have a validated ES|QL)
     - \`attachment_id\` (optional, only when updating an existing visualization)
   - For multi-panel requests, resolve the index (and validate the fields) ONCE up front, then call ${
     platformCoreTools.createVisualization
   } once per panel WITH that \`index\`. Do **not** fan out several index-less calls in parallel — a single failed auto-discovery fails all of them identically.

4. **Interpret output and preserve artifacts**
   - Each successful call returns \`data.attachment_id\` and \`data.version\`. Save them: they identify the persisted attachment for rendering and for later updates (pass \`attachment_id\` back to update it in place).
   - If \`data.attachment_id\` is missing, persistence failed; report that and treat the result as non-renderable and non-reusable.

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

Poor prompt patterns:
- "Show CPU" / "Make a chart" / "Display everything" (too vague)
- Prompts naming fields you have not confirmed exist (e.g. assuming \`system.cpu.total.pct\`, \`transaction.duration.us\`, or \`service.name\` without checking the mapping — these belong to specific integrations that may not be installed)

Always reference real fields from the index mapping.

## Choosing the Renderer

${
  platformCoreTools.createVisualization
} renders with **Lens** (standard charts) or **Vega** (custom Vega-Lite). Decide and pass \`renderer\`:

- Pass \`renderer: "vega"\` when:
  - The user explicitly asks for a Vega or Vega-Lite visualization, OR
  - No Lens chart type fits — e.g. small multiples / faceting, layered or combination charts (bars plus an overlaid line), scatter / bubble plots with an encoded size dimension, or custom tooltips/encodings.
- Otherwise pass \`renderer: "lens"\` (the default when omitted) with the best-fitting \`chartType\`.
- When updating an existing attachment, \`renderer\` is ignored — edits keep the existing renderer.

**Scope — "Vega" here means Vega-Lite, not full Vega.** The Vega renderer only supports the Vega-Lite grammar. It cannot do full Vega features such as custom signals / imperative interactivity, arbitrary data transforms or expressions, or bespoke rendering. If a request fits neither a Lens chart type nor the Vega-Lite grammar, do **not** force a broken or misleading chart. Be honest with the user: explain that the requested chart is not supported in Vega-Lite and that full Vega is not available yet, then offer alternatives — the closest Vega-Lite approximation, a standard Lens chart, or splitting the request into multiple charts — and ask how they would like to proceed.

## Chart Type Guidance

Supported values for \`chartType\`: ${Object.values(SupportedChartType).join(', ')}.

${chartTypeSelectionContent}

When uncertain, omit \`chartType\` and let ${
    platformCoreTools.createVisualization
  } infer the best type from the request.

## Edge Cases

- **Requested field missing:** suggest nearest valid fields from the index mapping.
- **ES|QL returns no data:** explain and suggest broader time range/filters.
- **Unsupported chart request:** pick closest supported type and explain the substitution.
- **Needs full Vega (beyond Vega-Lite):** do not fake it or ship a broken chart. State plainly that the requested chart is not supported in Vega-Lite yet and that full Vega is not available, then offer alternatives (closest Vega-Lite approximation, a Lens chart, or multiple charts) and let the user choose.
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
