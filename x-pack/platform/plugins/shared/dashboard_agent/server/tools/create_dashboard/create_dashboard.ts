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
import { getToolResultId } from '@kbn/agent-builder-server';
import type { DashboardAppLocator } from '@kbn/dashboard-plugin/common/locator/locator';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

import { dashboardTools } from '../../../common';
import {
  checkDashboardToolsAvailability,
  normalizePanels,
  buildMarkdownPanel,
  getMarkdownPanelHeight,
} from '../utils';
import type { DashboardContent } from '../types';

const createDashboardSchema = z.object({
  title: z.string().describe('The title of the dashboard to create.'),
  description: z.string().describe('A description of the dashboard.'),
  visualizations: z
    .array(z.string())
    .optional()
    .describe(
      'An array of tool_result_ids from previous create_visualizations calls. These reference the visualizations to include in the dashboard.'
    ),
  markdownContent: z
    .string()
    .describe(
      'Markdown content for a summary panel displayed at the top of the dashboard. Should describe what the dashboard shows and provide helpful context.'
    ),
});

export const createDashboardTool = ({
  dashboardLocator,
  spaces,
}: {
  dashboardLocator: DashboardAppLocator;
  spaces?: SpacesPluginStart;
}): BuiltinToolDefinition<typeof createDashboardSchema> => {
  return {
    id: dashboardTools.createDashboard,
    type: ToolType.builtin,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    description: `Create an in-memory dashboard with the specified title, description, visualizations, and a markdown summary.

This tool will:
1. Accept a title and description for the dashboard
2. Accept markdown content for a summary panel at the top
3. Accept an array of visualization tool_result_ids from previous create_visualizations calls
4. Generate an in-memory dashboard URL (not saved until user explicitly saves it)

The dashboard is created in edit mode so the user can review and save it.`,
    schema: createDashboardSchema,
    tags: [],
    handler: async (
      { title, description, visualizations, markdownContent },
      { logger, request, resultStore }
    ) => {
      try {
        const visualizationIds = visualizations ?? [];

        // Build markdown panel and visualization panels
        const markdownPanel = buildMarkdownPanel(markdownContent);
        const yOffset = getMarkdownPanelHeight(markdownContent);
        const dashboardPanels = [
          markdownPanel,
          ...normalizePanels(visualizationIds, yOffset, resultStore),
        ];

        const spaceId = spaces?.spacesService?.getSpaceId(request);

        // Generate in-memory dashboard URL - no dashboardId means unsaved/create mode
        const dashboardUrl = await dashboardLocator.getRedirectUrl(
          {
            // No dashboardId means it will be an unsaved "create" dashboard
            panels: dashboardPanels,
            title,
            description,
            viewMode: 'edit', // Allow user to edit and save
            // TODO: Improve time range selection
            time_range: { from: 'now-15m', to: 'now' },
          },
          { spaceId }
        );

        logger.info(`In-memory dashboard created with ${dashboardPanels.length} panels`);

        const toolResultId = getToolResultId();

        const content: DashboardContent = {
          url: dashboardUrl,
          title,
          description,
          markdownContent,
          panelCount: dashboardPanels.length,
          visualizationIds,
        };

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: toolResultId,
              data: { content },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in create_dashboard tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create dashboard: ${error.message}`,
                metadata: { title, description },
              },
            },
          ],
        };
      }
    },
  };
};
