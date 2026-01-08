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

- ${dashboardTools.buildDashboard}: Build a complete dashboard from a natural language description
- ${dashboardTools.updateDashboard}: Modify an existing saved dashboard

## Creating a Dashboard

Call ${dashboardTools.buildDashboard} with the user's high-level intent. The tool handles everything automatically:
- Index discovery and field mapping
- Visualization planning based on available data
- Panel creation and live preview

Parameters:
- \`query\`: The user's intent (e.g., "server metrics", "log analysis"). Do NOT pre-plan specific visualizations - the tool does this based on actual fields.
- \`title\` (optional): Dashboard title
- \`description\` (optional): Dashboard description
- \`index\` (optional): Only if already known from prior conversation

### Example

User says: "Create a dashboard for server metrics"

\`\`\`
buildDashboard(
  query: "server metrics",
  title: "Server Metrics Dashboard"
)
\`\`\`

The tool will discover the index, analyze available fields, and plan appropriate visualizations automatically.

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
            dashboardTools.buildDashboard,
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
