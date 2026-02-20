/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
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
        instructions: `## Tool Selection Guide

**When to use which tool:**
- "Create a visualization" / "Show me a chart" / "Visualize X" → Use ${
          platformCoreTools.createVisualization
        }
- "Create a dashboard" / "Build a dashboard with..." / "Make a dashboard" → Use ${
          dashboardTools.manageDashboard
        }

## Visualization Tool

- ${platformCoreTools.createVisualization}: Create a standalone visualization

When the user asks to create **a visualization** (singular, not a dashboard):

1. **Discover data first** - Use ${platformCoreTools.listIndices} and ${
          platformCoreTools.getIndexMapping
        } to find relevant indices and fields
2. **Create the visualization** - Call ${
          platformCoreTools.createVisualization
        } with the query referencing actual index names and field names you discovered

## Dashboard Tool

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
   - \`visualizationQueries\`: Array of visualization configurations to create inline:
     - Each item should have a \`query\` that references actual index names and field names you discovered
     - Example query: "Show system.cpu.total.pct over time from metrics-*" (using real fields)
     - Pass \`index\` when you know the target index pattern to improve performance
     - Pass \`esql\` if you have a pre-generated query to improve performance
     - Pass \`chartType\` (${Object.values(SupportedChartType).join(
       ', '
     )}) to skip chart type detection
   - \`markdownContent\`: (optional) Markdown summary content shown in a top markdown panel
     - Use markdown formatting (headers, lists, bold text)
     - **IMPORTANT**: Use actual line breaks in the string, NOT escape sequences like \\n

   Example input:
   \`\`\`
   {
     "title": "Server Metrics Dashboard",
     "description": "Overview of server performance metrics",
     "visualizationQueries": [
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

1. **Get the previous dashboard's attachment ID** - This was returned by a previous ${
          dashboardTools.manageDashboard
        } call in \`data.dashboardAttachment.id\`

2. **Call ${dashboardTools.manageDashboard}** with:
   - \`dashboardAttachmentId\`: The ID from the previous operation
   - \`visualizationQueries\`: (optional) Array of new visualization configs to add
   - \`existingVisualizationIds\`: (optional) Array of existing visualization attachment IDs to add
   - \`removePanelIds\`: (optional) Array of panel IDs to remove from the dashboard
   - \`title\`: (optional) Updated dashboard title
   - \`description\`: (optional) Updated dashboard description
   - \`markdownContent\`: (optional) Updated markdown summary content

The tool updates the dashboard attachment and returns the same attachment ID under \`data.dashboardAttachment.id\` with a new version.

**Example workflow:**
1. User: "Create a dashboard with CPU metrics"
   -> ${platformCoreTools.listIndices} -> ${platformCoreTools.getIndexMapping}
   -> ${dashboardTools.manageDashboard}({ title: "...", visualizationQueries: [...] })
   -> Returns dashboard with \`data.dashboardAttachment.id: "dash-abc123"\`

2. User: "Add memory metrics to that dashboard"
   -> ${dashboardTools.manageDashboard}({
        dashboardAttachmentId: "dash-abc123",
        visualizationQueries: [{ query: "Show memory usage over time", ... }]
      })
   -> Returns updated dashboard (same \`data.dashboardAttachment.id\`, new version)

3. User: "Remove the first panel"
   -> ${dashboardTools.manageDashboard}({
        dashboardAttachmentId: "dash-abc123",
        removePanelIds: ["panel-id-to-remove"]
      })
   -> Returns updated dashboard with panel removed
`,
      },
      tools: [
        {
          tool_ids: [
            dashboardTools.manageDashboard,
            platformCoreTools.executeEsql,
            platformCoreTools.createVisualization,
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
