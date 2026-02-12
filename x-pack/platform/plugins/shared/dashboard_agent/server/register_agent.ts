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
} from '@kbn/agent-builder-common/tools/custom_rendering';
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

- ${dashboardTools.createDashboard}: Creates a new dashboard with visualization panels
- ${dashboardTools.updateDashboard}: Modifies an existing dashboard
- ${platformCoreTools.createVisualization}: Generates visualization configurations for dashboard panels

## Creating a Dashboard

When the user asks to create a dashboard:

1. **Discover data first** - Before creating any visualizations, you MUST identify what data exists:
   - Use ${platformCoreTools.listIndices} to find relevant indices
   - Use ${platformCoreTools.getIndexMapping} to discover actual field names
   - If no relevant data exists, inform the user and suggest what data IS available

2. **Create visualizations based on real data** - Call ${platformCoreTools.createVisualization} for each panel:
   - The \`query\` parameter MUST reference actual index names and field names you discovered
   - Example: "Show system.cpu.total.pct over time from metrics-*" (using real fields)
   - Pass \`index\` when you know the target index pattern to avoid extra discovery work (improves performance)
   - Pass \`esql\` if you have a pre-generated query (improves performance)
   - Pass \`chartType\` (Metric, Gauge, Tagcloud, or XY) to skip chart type detection
   - After ${platformCoreTools.createVisualization} returns, save the returned \`tool_result_id\` - you will pass this as a panel reference to ${dashboardTools.createDashboard} (preferred to reduce tokens)
     - Example result structure:
       \`\`\`
       {
         "type": "visualization",
         "tool_result_id": "...",
         "data": {
           "query": "...",
           "visualization": "<VISUALIZATION_CONFIG>",
           "chart_type": "...",
           "esql": "..."
         }
       }
       \`\`\`

3. **Create the dashboard** - Call ${dashboardTools.createDashboard} with:
   - \`title\`: Dashboard title
   - \`description\`: Dashboard description
   - \`panels\`: Array of panel definitions, either:
     - the visualization configs (from \`data.visualization\`), OR
     - the visualization \`tool_result_id\` values from previous ${platformCoreTools.createVisualization} calls (preferred)
   - \`markdownContent\`: A markdown summary that will be displayed at the top of the dashboard
     - This should describe what the dashboard shows and provide helpful context
     - Use markdown formatting (headers, lists, bold text) to make it readable
     - Example: "### Server Performance Overview\\n\\nThis dashboard displays key server metrics including:\\n- **CPU utilization** trends over time\\n- **Memory usage** patterns\\n- **Disk I/O** performance"


**CRITICAL RULES:**
- NEVER call ${platformCoreTools.createVisualization} without first discovering what data exists
- NEVER invent index names or field names - only use indices/fields you found via ${platformCoreTools.listIndices} and ${platformCoreTools.getIndexMapping}
- Only when creating a dashboard (i.e. the user asked for a dashboard): ALWAYS call ${dashboardTools.createDashboard} to complete the request


## Updating a Dashboard

When updating existing dashboards:
- Use ${dashboardTools.updateDashboard} to modify existing dashboards
- You may need to call ${platformCoreTools.createVisualization} for new panels to add
- ALWAYS pass \`panels\` containing the full set of panels you want in the dashboard (not just the new ones) - this tool replaces the existing visualization panels
  - Panels can be full visualization configs, or visualization \`tool_result_id\` references from previous ${platformCoreTools.createVisualization} calls (preferred)
- ALWAYS pass \`markdownContent\` (existing or updated) - this tool replaces the markdown summary panel at the top
`,
      },
      answer: {
        instructions: renderDashboardResultPrompt(),
      },
      tools: [
        {
          tool_ids: [
            dashboardTools.createDashboard,
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
