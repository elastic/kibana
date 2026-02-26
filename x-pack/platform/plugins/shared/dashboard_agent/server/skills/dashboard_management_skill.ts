/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { getChartTypeSelectionPromptContent } from '@kbn/agent-builder-genai-utils';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { manageDashboardTool } from '../tools';
import { dashboardTools } from '../../common';

const chartTypeSelectionContent = getChartTypeSelectionPromptContent();

export const dashboardManagementSkill = defineSkillType({
  id: 'dashboard-management',
  name: 'dashboard-management',
  basePath: 'skills/platform/dashboard',
  description:
    'Create or update Kibana dashboards from natural-language requests, with strict index and field discovery before generating visualizations.',
  content: `## When to Use This Skill

Use this skill when:
- A user asks to create a dashboard with one or more visualizations.
- A user asks to update an in-memory dashboard from a previous tool result.
- A request includes ordered panel-management actions (add, remove, markdown, metadata updates).
- A user asks for a multi-panel overview of their data.

Do **not** use this skill when:
- The user asks for a single chart or visualization without mentioning a dashboard.
- The user only needs to query or explore data without building a visual.
- The user asks about saved or persisted dashboards in Kibana. This skill manages in-memory dashboards only.

## Available Tools and Their Roles

This skill has access to the following tools. Each has a specific role in the dashboard workflow:

- **${
    platformCoreTools.listIndices
  }**: Discover available indices, aliases, and data streams. Always call this first for data discovery.
- **${
    platformCoreTools.getIndexMapping
  }**: Retrieve field names and types for a specific index. Call after identifying candidate indices.
- **${
    platformCoreTools.generateEsql
  }**: Generate an ES|QL query from natural language. Use when you want to pre-build an optimized query before passing it to a visualization.
- **${
    platformCoreTools.executeEsql
  }**: Execute an ES|QL query and return results. Use to validate that data actually exists or to preview the data shape before building visualizations.
- **${
    dashboardTools.manageDashboard
  }**: Create or update an in-memory dashboard via ordered \`operations[]\`. This is the primary tool for this skill.

## Core Instructions

### Step 1: Discover and validate data

Before generating any visualization, always ground your work in real data:

1. Call ${
    platformCoreTools.listIndices
  } to find relevant indices matching the user's domain (e.g., \`metrics-*\`, \`logs-*\`, \`filebeat-*\`).
2. Call ${
    platformCoreTools.getIndexMapping
  } on the most promising index to discover available field names and their types.
3. **Never invent index names or field names.** Only use names returned by the tools.
4. If the user mentions specific field names, verify they exist in the mapping. If they do not exist, suggest the closest matching fields from the mapping.

### Step 2: Optionally pre-generate or validate queries

This step is optional. Use it when the user's request involves complex aggregations, specific filtering, or transformations:

- Use ${
    platformCoreTools.generateEsql
  } to create an optimized ES|QL query from the user's natural language description.
- Use ${
    platformCoreTools.executeEsql
  } to run the query and verify it returns data before passing it to the dashboard.

You can pass pre-generated ES|QL into \`add_generated_panels.items[].esql\` for higher quality visualizations.

For straightforward requests (e.g., "show X over time"), skip this step and let the dashboard tool handle query generation internally.

### Step 3: Call \`${dashboardTools.manageDashboard}\` with operation payloads

The tool contract is:

\`\`\`json
{
  "dashboardAttachmentId": "optional-existing-id",
  "operations": [
    { "operation": "set_metadata", "title": "optional", "description": "optional" },
    { "operation": "upsert_markdown", "markdownContent": "..." },
    { "operation": "add_generated_panels", "items": [] },
    { "operation": "add_panels_from_attachments", "attachmentIds": [] },
    { "operation": "remove_panels", "panelIds": [] }
  ]
}
\`\`\`


#### Creating a new dashboard

When creating a dashboard, include ordered operations such as:
1. \`set_metadata\` to set title/description
2. \`upsert_markdown\` to add a summary panel
3. \`add_generated_panels\` with as many panels as needed to satisfy the user's intent and the available data

If you omit metadata on a new dashboard, creation can fail.

#### Updating an existing dashboard

1. Extract the dashboard attachment ID from the previous tool result: look for \`data.dashboardAttachment.id\`.
2. Call ${
    dashboardTools.manageDashboard
  } with \`dashboardAttachmentId\` and an ordered \`operations[]\` list.
3. Use:
   - \`add_generated_panels\` to add new generated panels
   - \`add_panels_from_attachments\` to add previously created attachments
   - \`remove_panels\` to remove by \`panelId\`
   - \`set_metadata\` / \`upsert_markdown\` for dashboard metadata and summary updates

**Keeping the markdown summary in sync:** After adding or removing panels, the existing markdown summary panel may no longer reflect the current dashboard content. If the update changes the panel composition (new panels added or existing ones removed), check whether the markdown summary still accurately describes the dashboard. If it does not, ask the user whether they would like you to update the markdown summary to match the new dashboard state. Do not update it silently — let the user decide.

### Step 4: Interpret results and communicate to the user

After a successful call, the tool returns:
- \`data.dashboardAttachment.id\`: the attachment ID needed for future updates.
- \`data.dashboardAttachment.content.panels\`: array of \`{ type, panelId, title }\` for each panel on the dashboard.
- \`data.failures\`: array of \`{ type, identifier, error }\` for visualizations that failed to generate. Only present when there are failures.
- \`data.version\`: the version number of the dashboard attachment, incrementing with each update.

See \`./examples/tool-result-format\` for the complete result structure with examples.

**After a successful call:**
- Summarize what was created or updated. List each panel by title so the user knows what is included.
- If \`failures\` is present and non-empty, explain which visualizations could not be generated and include the error message. Offer to retry with adjusted queries or different fields.
- Remember the \`dashboardAttachment.id\` for follow-up updates. Do not ask the user for it again.

## Writing Effective Visualization Queries

Each entry in \`add_generated_panels.items[]\` accepts:
- \`query\` (**required**): a natural-language description of the visualization. This is sent to an LLM to generate the panel, so precision matters.
- \`index\` (optional, recommended): the target index, alias, or data stream. Providing this avoids an extra index-discovery step during generation.
- \`chartType\` (optional): one of ${Object.values(SupportedChartType).join(
    ', '
  )}. Set only when you are confident about the right chart type. See the chart type guide below.
- \`esql\` (optional): a pre-generated ES|QL query. When provided, the visualization generator uses this directly instead of generating a query from scratch.

**Good queries are specific and reference real field names:**

- "Show average system.cpu.total.pct over time, grouped by host.name" — specifies the field, aggregation, and breakdown.
- "Display the top 10 source.ip addresses by document count as a bar chart" — clear metric, dimension, and ranking.
- "Show a single metric of the total number of log entries where log.level is error" — clear aggregation with a filter.

**Bad queries lack specificity:**

- "Show CPU" — which field? Which aggregation? Over time or as a single number?
- "Make a chart" — no information about what data or what kind of visualization.
- "Display everything" — no focus, will produce poor results.

Always use the actual field names discovered in Step 2 when composing visualization queries.

## Chart Type Selection Guide

Choose chart type based on what the data represents and what the user wants to understand:

${chartTypeSelectionContent}

When you are unsure which chart type fits best, **omit \`chartType\`** and let the visualization generator decide based on the query content.

## Dashboard Composition Guidelines

A well-composed dashboard tells a coherent story about the data:

1. **Start with a markdown panel** to set context: what the dashboard monitors, what the data source is, and any important notes.
2. **Lead with high-level metrics** (Metric or Gauge panels): total counts, averages, key performance indicators that give an at-a-glance summary.
3. **Follow with time-series trends** (XY line/area panels): how the key metrics change over time.
4. **Add breakdowns and distributions** (XY bar, Heatmap, Tagcloud panels): top-N rankings, categorical splits, and density views.
5. **Include as many panels as are valuable for the underlying data and user intent.** Let the richness and diversity of the available fields drive the panel count instead of a fixed numeric target.
6. **Every panel should serve a clear purpose.** Do not add panels just to fill space, but do not artificially limit the dashboard when more panels would provide genuine insight.

When the user's request is vague (e.g., "create a dashboard for my logs"), compose a balanced set of panels covering:
- One or two overview metrics (total count, error rate)
- One or two time-series trends (volume over time, errors over time)
- One or two breakdowns (top sources, top error types)

Base panel selection on the fields actually available in the discovered index mapping.

## Examples

### Example 1: Creating a dashboard from scratch

**User request:** "Create a dashboard showing my web server performance"

**Agent flow:**

1. **Discover data:**
   - Call ${
     platformCoreTools.listIndices
   } → finds \`metrics-system.cpu-default\`, \`metrics-system.memory-default\`, \`logs-nginx.access-default\`
   - Call ${
     platformCoreTools.getIndexMapping
   } on \`metrics-system.cpu-default\` → finds fields: \`system.cpu.total.pct\`, \`host.name\`, \`@timestamp\`
   - Call ${
     platformCoreTools.getIndexMapping
   } on \`logs-nginx.access-default\` → finds fields: \`http.response.status_code\`, \`url.path\`, \`source.ip\`, \`http.response.body.bytes\`, \`@timestamp\`

2. **Compose a rich dashboard** using discovered fields:
   - include overview metrics, trends, breakdowns, and distribution panels
   - choose the panel count based on user intent; if intent is unclear, create a rich dashboard grounded in the available data

3. **Call ${dashboardTools.manageDashboard}:**
   \`\`\`json
   {
     "operations": [
       {
         "operation": "set_metadata",
         "title": "Web Server Performance",
         "description": "Overview of nginx request traffic and host CPU usage across production hosts"
       },
       {
         "operation": "upsert_markdown",
         "markdownContent": "### Web Server Performance\n\nThis dashboard combines nginx access logs with system CPU metrics."
       },
       {
         "operation": "add_generated_panels",
         "items": [
           {
             "query": "Show total request count as a metric",
             "index": "logs-nginx.access-default",
             "chartType": "${SupportedChartType.Metric}"
           },
           {
             "query": "Show average system.cpu.total.pct as a metric",
             "index": "metrics-system.cpu-default",
             "chartType": "${SupportedChartType.Metric}"
           },
           {
             "query": "Show request count over time",
             "index": "logs-nginx.access-default",
             "chartType": "${SupportedChartType.XY}"
           },
           {
             "query": "Show 95th percentile of http.response.body.bytes over time",
             "index": "logs-nginx.access-default",
             "chartType": "${SupportedChartType.XY}"
           },
           {
             "query": "Show top 10 url.path values by request count",
             "index": "logs-nginx.access-default",
             "chartType": "${SupportedChartType.XY}"
           },
           {
             "query": "Show top source.ip values by request count",
             "index": "logs-nginx.access-default",
             "chartType": "${SupportedChartType.XY}"
           },
           {
             "query": "Show system.cpu.total.pct over time grouped by host.name",
             "index": "metrics-system.cpu-default",
             "chartType": "${SupportedChartType.XY}"
           },
           {
             "query": "Show top http.response.status_code values by request count",
             "index": "logs-nginx.access-default",
             "chartType": "${SupportedChartType.XY}"
           }
         ]
       }
     ]
   }
   \`\`\`

4. **Report to user:** summarize panel set and mention any failures.

### Example 2: Updating with ordered add + remove + markdown refresh

**User request:** "Add a panel showing response sizes and remove the URL paths panel"

**Agent flow:**

1. From the previous tool result, extract:
   - \`dashboardAttachmentId\`: \`"abc-123"\`
   - Panel list: identify "Top URL Paths" panel has \`panelId\`: \`"panel-xyz"\`

2. No new data discovery needed — fields are already known from the creation step.

3. **Call ${dashboardTools.manageDashboard}:**
   \`\`\`json
   {
     "dashboardAttachmentId": "abc-123",
     "operations": [
       { "operation": "remove_panels", "panelIds": ["panel-xyz"] },
       {
         "operation": "add_generated_panels",
         "items": [
           {
             "query": "Show average http.response.body.bytes over time as a line chart",
             "index": "logs-nginx.access-default",
             "chartType": "${SupportedChartType.XY}"
           }
         ]
       },
       {
         "operation": "upsert_markdown",
         "markdownContent": "### Web Server Performance\n\nUpdated with response-size trend and refreshed panel composition."
       }
     ]
   }
   \`\`\`

4. **Report to user:** "I added a response size trend panel and removed the URL paths panel. The dashboard now has 5 panels."

### Example 3: Adding existing attachments to a dashboard

**User request:** "Add the CPU chart you just made to the dashboard"

**Agent flow:**

1. The user previously asked for a standalone visualization, which was created with attachment ID \`"viz-456"\`.
2. The current dashboard has attachment ID \`"abc-123"\`.

3. **Call ${dashboardTools.manageDashboard}:**
   \`\`\`json
   {
     "dashboardAttachmentId": "abc-123",
     "operations": [
       {
         "operation": "add_panels_from_attachments",
         "attachmentIds": ["viz-456"]
       }
     ]
   }
   \`\`\`

4. **Report to user:** "I added the CPU chart to the dashboard."

## Edge Cases and Limitations

- **No relevant data found:** Report exactly which indices you searched (via ${
    platformCoreTools.listIndices
  }) and which fields were available (via ${
    platformCoreTools.getIndexMapping
  }). Suggest alternative indices if any are close to what the user described. Do not fabricate data or field names.
- **Partial visualization failures:** The tool result may include a \`failures\` array alongside successful panels. The dashboard is still created/updated with the successful panels. Report each failure with its error message and offer to retry with adjusted queries or different fields.
- **Missing dashboard attachment ID on updates:** If the user asks to update a dashboard but the prior \`dashboardAttachment.id\` is not available in conversation context, ask the user to clarify which dashboard they mean or offer to create a new one.
- **Ambiguous chart type:** When the user's intent does not clearly map to one chart type, omit \`chartType\` from the visualization query and let the generator choose automatically.
- **Unsupported chart type requested:** If the user asks for a chart type not in the supported set (${Object.values(
    SupportedChartType
  ).join(', ')}), choose the closest supported alternative and explain the substitution to the user.
- **Very large dashboards:** If the data supports many dimensions, create as many panels as are valuable. However, if the user explicitly asks for a focused or compact dashboard, help them prioritize the most important panels.
- **Reusing previously created visualizations:** When the user says "add the visualization you just created to the dashboard", use \`add_panels_from_attachments\` with that attachment ID.
- **User asks to update a panel in place:** Prefer ordered remove + add operations in the same call.

See \`./examples/manage-dashboard-payloads\` for complete payload examples covering all scenarios.
`,
  referencedContent: [
    {
      relativePath: './examples',
      name: 'manage-dashboard-payloads',
      content: `# Manage Dashboard Payload Examples

## Create a new dashboard

\`\`\`json
{
  "operations": [
    {
      "operation": "set_metadata",
      "title": "Web Server Performance",
      "description": "Overview of web server request traffic and host resource usage"
    },
    {
      "operation": "upsert_markdown",
      "markdownContent": "### Web Server Performance\n\nThis dashboard tracks nginx access logs and system metrics across all production hosts."
    },
    {
      "operation": "add_generated_panels",
      "items": [
        {
          "query": "Show the total number of documents as a single metric",
          "index": "logs-nginx.access-default",
          "chartType": "metric"
        },
        {
          "query": "Show average system.cpu.total.pct as a single metric",
          "index": "metrics-system.cpu-default",
          "chartType": "metric"
        },
        {
          "query": "Show document count over time as a line chart",
          "index": "logs-nginx.access-default",
          "chartType": "xy"
        }
      ]
    }
  ]
}
\`\`\`

## Update a dashboard — ordered remove + add + markdown

\`\`\`json
{
  "dashboardAttachmentId": "abc-123",
  "operations": [
    { "operation": "remove_panels", "panelIds": ["panel-xyz"] },
    {
      "operation": "add_generated_panels",
      "items": [
        {
          "query": "Show average http.response.body.bytes over time",
          "index": "logs-nginx.access-default",
          "chartType": "xy"
        }
      ]
    },
    {
      "operation": "upsert_markdown",
      "markdownContent": "### Updated Summary\n\nNow includes response-size trend."
    }
  ]
}
\`\`\`

## Update a dashboard — add existing attachment panels

Use this when the user wants to add a visualization that was already created earlier in the conversation.

\`\`\`json
{
  "dashboardAttachmentId": "abc-123",
  "operations": [
    {
      "operation": "add_panels_from_attachments",
      "attachmentIds": ["viz-attachment-456"]
    }
  ]
}
\`\`\`

## Update a dashboard — metadata only

\`\`\`json
{
  "dashboardAttachmentId": "abc-123",
  "operations": [
    {
      "operation": "set_metadata",
      "title": "Web Server Performance (Production)"
    },
    {
      "operation": "upsert_markdown",
      "markdownContent": "### Updated Summary\n\nNow filtered to production hosts only."
    }
  ]
}
\`\`\`
`,
    },
    {
      relativePath: './examples',
      name: 'tool-result-format',
      content: `# Tool Result Format Reference

## Successful dashboard creation or update

\`\`\`json
{
  "type": "dashboard",
  "data": {
    "version": 1,
    "dashboardAttachment": {
      "id": "abc-123",
      "content": {
        "title": "Web Server Performance",
        "description": "Overview of web server request traffic and host resource usage",
        "panels": [
          { "type": "generic", "panelId": "md-001", "title": "Summary" },
          { "type": "lens", "panelId": "viz-001", "title": "Total Requests" },
          { "type": "lens", "panelId": "viz-002", "title": "Average CPU Usage" },
          { "type": "lens", "panelId": "viz-003", "title": "Requests Over Time" }
        ]
      }
    }
  }
}
\`\`\`

Key fields to remember:
- \`data.dashboardAttachment.id\` — save this value. Pass it as \`dashboardAttachmentId\` in follow-up update calls.
- \`data.dashboardAttachment.content.panels[].panelId\` — use these when the user asks to remove a specific panel via \`remove_panels.panelIds\`.
- \`data.version\` — increments with each update to the dashboard.
- Panels with \`type: "generic"\` are non-visualization panels (e.g., markdown summary). Panels with \`type: "lens"\` are visualizations.

## Successful result with partial failures

\`\`\`json
{
  "type": "dashboard",
  "data": {
    "version": 1,
    "failures": [
      {
        "type": "visualization_query",
        "identifier": "Show disk I/O over time",
        "error": "No matching fields found for disk I/O in the specified index"
      }
    ],
    "dashboardAttachment": {
      "id": "abc-123",
      "content": {
        "title": "Server Metrics",
        "description": "System performance overview",
        "panels": [
          { "type": "lens", "panelId": "viz-001", "title": "CPU Usage Over Time" }
        ]
      }
    }
  }
}
\`\`\`

When \`failures\` is present:
- The dashboard was still created or updated with the panels that succeeded.
- Report each failure to the user: include \`identifier\` (the query that failed) and \`error\` (the reason).
- Offer to retry the failed visualizations with adjusted queries, different field names, or a different index.

## Error result

\`\`\`json
{
  "type": "error",
  "data": {
    "message": "Title and description are required when creating a new dashboard.",
    "metadata": {
      "title": null,
      "description": null,
      "dashboardAttachmentId": null
    }
  }
}
\`\`\`

On error, the dashboard was not created or updated. Inform the user about what went wrong and how to fix it (e.g., provide missing required fields).
`,
    },
  ],
  getRegistryTools: () => [
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
  ],
  getInlineTools: () => [manageDashboardTool()],
});
