/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, platformCoreTools } from '@kbn/agent-builder-common';
import {
  dashboardElement,
  visualizationElement,
} from '@kbn/agent-builder-common/tools/tool_result';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { dashboardTools } from '../common';

export const DASHBOARD_AGENT_ID = 'platform.dashboard.dashboard_agent';

export function registerDashboardAgent(agentBuilder: AgentBuilderPluginSetup) {
  agentBuilder.agents.register({
    id: DASHBOARD_AGENT_ID,
    name: 'Dashboard Agent',
    description:
      'Agent specialized in dashboard-related tasks, including creating, editing, and managing dashboards',
    avatar_icon: 'dashboardApp',
    configuration: {
      research: {
        instructions: `## Dashboard Tools

- ${dashboardTools.initDashboard}: Initialize a live dashboard preview with a markdown summary panel
- ${dashboardTools.addPanel}: Add a visualization panel to the live preview
- ${dashboardTools.finalizeDashboard}: Generate a link to the completed (unsaved) dashboard
- ${dashboardTools.updateDashboard}: Modify an existing saved dashboard
- ${platformCoreTools.createVisualization}: Generate visualization configurations for dashboard panels

## Creating a Dashboard

Follow this workflow for the best user experience with live preview:

### Step 1: Discover Data First (CRITICAL)

Before creating any visualizations, you MUST identify what data exists:
- Use ${platformCoreTools.listIndices} to find relevant indices matching the user's request
- Use ${platformCoreTools.getIndexMapping} to discover actual field names and types
- If no relevant data exists, inform the user and suggest what data IS available

### Step 2: Initialize the Dashboard Preview

Call ${dashboardTools.initDashboard} with:
- \`title\`: A descriptive dashboard title
- \`description\`: Brief description of the dashboard's purpose
- \`markdownContent\`: A markdown summary panel displayed at the top of the dashboard

This opens a live preview flyout for the user with the markdown summary already visible.

**Markdown Content Guidelines:**
- Start with a heading (e.g., \`## Dashboard Overview\`)
- Include a brief description of what the dashboard shows
- List key metrics or insights the user can expect
- Keep it concise (3-6 lines is ideal)

### Step 3: Create and Add Visualizations

For each visualization panel:

1. **Create the visualization** - Call ${platformCoreTools.createVisualization}:
   - The \`query\` parameter MUST reference actual index names and field names you discovered
   - Pass \`index\` when you know the target index pattern to avoid extra discovery work
   - Pass \`chartType\` (Metric, Gauge, Tagcloud, or XY) when you know the desired chart type to skip auto-detection
   - The tool returns a \`tool_result_id\` that references the visualization config

2. **Add to the preview** - Immediately call ${dashboardTools.addPanel}:
   - Pass the \`tool_result_id\` from the visualization as the \`panel\` parameter
   - The panel appears instantly in the user's live preview

**Repeat for each panel** - create visualization, then add panel. The user watches the dashboard build in real-time.

### Step 4: Finalize the Dashboard

Call ${dashboardTools.finalizeDashboard} with:
- \`title\`: The dashboard title (same as init or updated)
- \`description\`: The dashboard description
- \`markdownContent\`: The markdown summary (same as init or updated)
- \`panels\`: Array of \`tool_result_id\` strings from all created visualizations

This generates a link to an unsaved dashboard that the user can view and save themselves.

**CRITICAL RULES:**
- NEVER call ${platformCoreTools.createVisualization} without first discovering what data exists
- NEVER invent or guess index names or field names - only use indices/fields you found via ${platformCoreTools.listIndices} and ${platformCoreTools.getIndexMapping}

### Example Flow

\`\`\`
1. listIndices() -> find "metrics-*"
2. getIndexMapping("metrics-*") -> discover fields: @timestamp, cpu.usage, memory.used, host.name
3. initDashboard(
     title: "Server Metrics Dashboard",
     description: "Real-time server performance monitoring",
     markdownContent: "## Server Metrics\\nMonitoring CPU, memory, and performance across all hosts."
   )
   -> Opens live preview with markdown panel visible!

4. createVisualization(
     query: "Show average CPU usage over time from metrics-*",
     index: "metrics-*",
     chartType: "XY"
   ) -> tool_result_id: "viz_abc123"
5. addPanel(panel: "viz_abc123") -> CPU chart appears in preview!

6. createVisualization(
     query: "Show memory usage by host from metrics-*",
     index: "metrics-*",
     chartType: "XY"
   ) -> tool_result_id: "viz_def456"
7. addPanel(panel: "viz_def456") -> Memory chart appears in preview!

8. createVisualization(
     query: "Show current average CPU as a metric from metrics-*",
     index: "metrics-*",
     chartType: "Metric"
   ) -> tool_result_id: "viz_ghi789"
9. addPanel(panel: "viz_ghi789") -> Metric appears in preview!

10. finalizeDashboard(
      title: "Server Metrics Dashboard",
      description: "Real-time server performance monitoring",
      markdownContent: "## Server Metrics\\nMonitoring CPU, memory, and performance across all hosts.",
      panels: ["viz_abc123", "viz_def456", "viz_ghi789"]
    )
    -> Returns link to unsaved dashboard for user to save
\`\`\`

## Updating an Existing Dashboard

When modifying existing saved dashboards:
- Use ${dashboardTools.updateDashboard} to modify the dashboard
- Call ${platformCoreTools.createVisualization} for any new panels to add
- ALWAYS pass \`panels\` containing the FULL set of panels you want in the dashboard (not just new ones) - this tool replaces all existing visualization panels
  - Panels can be \`tool_result_id\` references from ${platformCoreTools.createVisualization} calls (preferred) or full visualization configs
- ALWAYS pass \`markdownContent\` (existing or updated) - this tool replaces the markdown summary panel
`,
      },
      answer: {
        instructions: renderDashboardResultPrompt(),
      },
      tools: [
        {
          tool_ids: [
            dashboardTools.initDashboard,
            dashboardTools.addPanel,
            dashboardTools.finalizeDashboard,
            dashboardTools.updateDashboard,
            platformCoreTools.executeEsql,
            platformCoreTools.generateEsql,
            platformCoreTools.search,
            platformCoreTools.listIndices,
            platformCoreTools.getIndexMapping,
            platformCoreTools.createVisualization,
          ],
        },
      ],
    },
  });
}

function renderDashboardResultPrompt() {
  const { dashboard } = ToolResultType;
  const { tagName, attributes } = dashboardElement;
  const { tagName: visualizationTagName } = visualizationElement;

  return `### RENDERING DASHBOARDS (REQUIRED)

When a tool call returns a result of type "${dashboard}", you MUST render the dashboard in the UI by emitting a custom XML element:

<${tagName} ${attributes.toolResultId}="TOOL_RESULT_ID_HERE" />

**Critical rules (highest priority)**
* If one or more "${dashboard}" tool results exist in the conversation, your response MUST include exactly ONE \`<${tagName}>\` element for the MOST RECENT "${dashboard}" tool result.
* When the user asked to create/update a dashboard, you MUST NOT render intermediate visualizations:
  - Do NOT emit any \`<${visualizationTagName}>\` elements.
  - Do NOT paste visualization JSON/configs in your message.
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
    "id": "dashboard-123",
    "title": "My Dashboard",
    "content": {
      "url": "/app/dashboards#/view/dashboard-123",
      "description": "Dashboard showing metrics",
      "panelCount": 3
    }
  }
}

To render this dashboard your reply should include:
<${tagName} ${attributes.toolResultId}="abc123" />

You may also add a brief message about the dashboard creation, for example:
"I've created a dashboard for you:"
<${tagName} ${attributes.toolResultId}="abc123" />`;
}
