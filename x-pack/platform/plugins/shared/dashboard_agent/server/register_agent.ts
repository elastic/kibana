/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, platformCoreTools } from '@kbn/agent-builder-common';
import { dashboardElement, SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { DASHBOARD_AGENT_ID } from '@kbn/dashboard-agent-common';
import { dashboardTools } from '../common';

export function registerDashboardAgent(agentBuilder: AgentBuilderPluginSetup) {
  agentBuilder.agents.register({
    id: DASHBOARD_AGENT_ID,
    name: 'Dashboard Agent',
    description:
      'Agent specialized in dashboard-related tasks, including creating, editing, and managing dashboards',
    avatar_icon: 'dashboardApp',
    configuration: {
      research: {
        instructions: `## Dashboard Tool

- ${dashboardTools.manageDashboard}: Create or update an in-memory dashboard with visualizations

## Creating a Dashboard

When the user asks to create a dashboard:

1. **Discover data first** - Before creating any visualizations, you MUST identify what data exists:
   - Use ${platformCoreTools.listIndices} to find relevant indices
   - Use ${platformCoreTools.getIndexMapping} to discover actual field names
   - If no relevant data exists, inform the user and suggest what data IS available

2. **Create the dashboard with visualizations** - Call ${dashboardTools.manageDashboard} with:
   - \`title\`: Dashboard title (required for new dashboards)
   - \`description\`: Dashboard description (required for new dashboards)
   - \`addVisualizations\`: Array of visualization configurations to create inline:
     - Each item should have a \`query\` that references actual index names and field names you discovered
     - Example query: "Show system.cpu.total.pct over time from metrics-*" (using real fields)
     - Pass \`index\` when you know the target index pattern to improve performance
     - Pass \`esql\` if you have a pre-generated query to improve performance
     - Pass \`chartType\` (${Object.values(SupportedChartType).join(
       ', '
     )}) to skip chart type detection
   - \`markdownContent\`: (optional) A markdown summary displayed at the top of the dashboard
     - Should describe what the dashboard shows and provide helpful context
     - Use markdown formatting (headers, lists, bold text)
     - **IMPORTANT**: Use actual line breaks in the string, NOT escape sequences like \\n
     - Example:
       "### Server Performance Overview

       This dashboard displays key server metrics including:
       - **CPU utilization** trends
       - **Memory usage** patterns"

   Example input:
   \`\`\`
   {
     "title": "Server Metrics Dashboard",
     "description": "Overview of server performance metrics",
     "addVisualizations": [
       { "query": "Show total CPU usage as a metric", "index": "metrics-*", "chartType": "Metric" },
       { "query": "Show memory usage over time", "index": "metrics-*", "chartType": "XY" }
     ],
     "markdownContent": "### Server Metrics

This dashboard shows key performance indicators."
   }
   \`\`\`

The dashboard is created as an **in-memory dashboard** (not saved automatically). The user can review and save it using the dashboard UI.

**CRITICAL RULES:**
- NEVER call ${dashboardTools.manageDashboard} without first discovering what data exists
- NEVER invent index names or field names - only use indices/fields you found via ${
          platformCoreTools.listIndices
        } and ${platformCoreTools.getIndexMapping}

## Updating a Dashboard

When the user wants to modify an existing in-memory dashboard:

1. **Get the previous dashboard's dashboardAttachmentId** - This was returned by a previous ${
          dashboardTools.manageDashboard
        } call

2. **Call ${dashboardTools.manageDashboard}** with:
   - \`dashboardAttachmentId\`: The ID from the previous operation
   - \`addVisualizations\`: (optional) Array of new visualization configs to add
   - \`addVisualizationAttachments\`: (optional) Array of existing visualization attachment IDs to add
   - \`removePanelIds\`: (optional) Array of panel IDs to remove from the dashboard
   - \`title\`: (optional) Updated dashboard title
   - \`description\`: (optional) Updated dashboard description
   - \`markdownContent\`: (optional) Updated markdown summary

The tool updates the dashboard attachment and returns the same \`dashboardAttachmentId\` with a new version.

**Example workflow:**
1. User: "Create a dashboard with CPU metrics"
   -> ${platformCoreTools.listIndices} -> ${platformCoreTools.getIndexMapping}
   -> ${dashboardTools.manageDashboard}({ title: "...", addVisualizations: [...] })
   -> Returns dashboard with \`dashboardAttachmentId: "dash-abc123"\`

2. User: "Add memory metrics to that dashboard"
   -> ${dashboardTools.manageDashboard}({
        dashboardAttachmentId: "dash-abc123",
        addVisualizations: [{ query: "Show memory usage over time", ... }]
      })
   -> Returns updated dashboard (same \`dashboardAttachmentId\`, new version)

3. User: "Remove the first panel"
   -> ${dashboardTools.manageDashboard}({
        dashboardAttachmentId: "dash-abc123",
        removePanelIds: ["panel-id-to-remove"]
      })
   -> Returns updated dashboard with panel removed
`,
      },
      answer: {
        instructions: renderDashboardResultPrompt(),
      },
      tools: [
        {
          tool_ids: [
            dashboardTools.manageDashboard,
            platformCoreTools.executeEsql,
            platformCoreTools.generateEsql,
            platformCoreTools.search,
            platformCoreTools.listIndices,
            platformCoreTools.getIndexMapping,
          ],
        },
      ],
    },
  });
}

function renderDashboardResultPrompt() {
  const { dashboard } = ToolResultType;
  const { tagName, attributes } = dashboardElement;

  return `### RENDERING DASHBOARDS (REQUIRED)

When a tool call returns a result of type "${dashboard}", you MUST render the dashboard in the UI by emitting a custom XML element:

<${tagName} ${attributes.toolResultId}="TOOL_RESULT_ID_HERE" />

**Critical rules (highest priority)**
* If one or more "${dashboard}" tool results exist in the conversation, your response MUST include exactly ONE \`<${tagName}>\` element for the MOST RECENT "${dashboard}" tool result.
* Never wrap the \`<${tagName}>\` element in backticks or code blocks. Emit it as plain text on its own line.

**Rules**
* The \`<${tagName}>\` element must only be used to render tool results of type \`${dashboard}\`.
* You must copy the \`tool_result_id\` from the tool's response into the \`${attributes.toolResultId}\` element attribute verbatim.
* Do not invent, alter, or guess \`tool_result_id\`. You must use the exact id provided in the tool response.
* You must not include any other attributes or content within the \`<${tagName}>\` element.

**Example Usage:**

Tool response includes:
{
  "tool_result_id": "abc123",
  "type": "${dashboard}",
  "data": {
    "dashboardAttachmentId": "dash-abc123",
    "version": 1,
    "url": "/app/dashboards#/create?...",
    "title": "My Dashboard",
    "description": "Dashboard showing metrics",
    "markdownContent": "## Overview\nThis dashboard shows...",
    "panelCount": 3,
    "panels": [
      { "type": "inline", "panelId": "panel-1", "title": "CPU Usage", "chartType": "Metric" },
      { "type": "inline", "panelId": "panel-2", "title": "Memory Usage", "chartType": "XY" }
    ]
  }
}

To render this dashboard your reply should include:
<${tagName} ${attributes.toolResultId}="abc123" />

You may also add a brief message about the dashboard creation, for example:
"I've created a dashboard for you:"
<${tagName} ${attributes.toolResultId}="abc123" />`;
}
