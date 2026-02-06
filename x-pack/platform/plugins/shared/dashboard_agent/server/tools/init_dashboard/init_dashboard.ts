/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import {
  dashboardTools,
  DASHBOARD_EVENTS,
  type DashboardSessionCreatedData,
} from '../../../common';
import { checkDashboardToolsAvailability } from '../utils';

const initDashboardSchema = z.object({
  title: z.string().describe('The title of the dashboard to create.'),
  description: z.string().describe('A description of the dashboard.'),
  markdownContent: z
    .string()
    .describe(
      'Markdown content for a summary panel displayed at the top of the dashboard. Should describe what the dashboard shows and provide helpful context.'
    ),
});

export const initDashboardTool = (): BuiltinToolDefinition<typeof initDashboardSchema> => {
  return {
    id: dashboardTools.initDashboard,
    type: ToolType.builtin,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    description: `Initialize a dashboard preview session. Call this before adding panels to show a live preview to the user.

This tool will:
1. Open a live dashboard preview flyout in the UI with a markdown summary panel
2. The user can watch as visualization panels are added in real-time

After calling this, use the addPanel tool to add visualizations, then finalizeDashboard to generate the link.`,
    schema: initDashboardSchema,
    tags: [],
    handler: async ({ title, description, markdownContent }, { events }) => {
      events.sendUiEvent<typeof DASHBOARD_EVENTS.SESSION_CREATED, DashboardSessionCreatedData>(
        DASHBOARD_EVENTS.SESSION_CREATED,
        { title, description, markdownContent }
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: `Dashboard preview initialized: "${title}" with summary panel. The user can now see the dashboard being built. Add visualization panels using the addPanel tool, then call finalizeDashboard to generate the link.`,
            },
          },
        ],
      };
    },
  };
};
