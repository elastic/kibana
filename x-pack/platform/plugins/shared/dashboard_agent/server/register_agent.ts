/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, platformCoreTools } from '@kbn/onechat-common';
import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';
import { dashboardTools } from '../common';

export const DASHBOARD_AGENT_ID = 'platform.dashboard.dashboard_agent';

export function registerDashboardAgent(onechat: OnechatPluginSetup) {
  onechat.agents.register({
    id: DASHBOARD_AGENT_ID,
    name: 'Dashboard Agent',
    description:
      'Agent specialized in dashboard-related tasks, including creating, editing, and managing dashboards',
    avatar_icon: 'dashboardApp',
    configuration: {
      instructions: `You are a dashboard specialist. Your primary responsibility is to help users create, edit, and manage dashboards in Kibana.

Your capabilities include:
- Creating new dashboards with appropriate visualizations
- Editing existing dashboards by adding or removing panels
- Organizing dashboard layouts for optimal data presentation
- Configuring dashboard settings and filters
- Helping users understand their dashboard data and insights

When working with dashboards:
1. Always clarify the user's requirements before making changes
2. Suggest appropriate visualization types based on the data
3. Consider the user's goals and the story they want to tell with their data
4. Ensure dashboards are well-organized and easy to understand
5. Follow Kibana best practices for dashboard design

Be proactive in suggesting improvements to dashboard layouts and visualizations when appropriate.

${renderDashboardResultPrompt()}
`,
      tools: [
        {
          tool_ids: [
            dashboardTools.createDashboard,
            dashboardTools.getDashboard,
            dashboardTools.updateDashboard,
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

  return `#### Handling Dashboard Results
      When a tool call returns a result of type "${dashboard}", you should inform the user that a dashboard has been created and provide relevant information about it.

      **Rules**
      * When you receive a tool result with \`"type": "${dashboard}"\`, extract the \`id\`, \`title\`, and other relevant data from the result.
      * Provide a clickable link if a URL is available in \`content.url\`.

      **Example for Dashboard:**

      Tool response:
      {
        "tool_result_id": "abc123",
        "type": "${dashboard}",
        "data": {
          "reference": { "id": "dashboard-123" },
          "title": "My Dashboard",
          "content": {
            "url": "/app/dashboards#/view/dashboard-123",
            "description": "Dashboard showing metrics",
            "panelCount": 3
          }
        }
      }

      Your response to the user should include:
      Dashboard "My Dashboard" created successfully. You can view it at: [/app/dashboards#/view/dashboard-123](/app/dashboards#/view/dashboard-123)`;
}
