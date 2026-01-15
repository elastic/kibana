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
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';

import { dashboardTools } from '../../../common';
import {
  checkDashboardToolsAvailability,
  normalizePanels,
  buildMarkdownPanel,
  getMarkdownPanelHeight,
  assignPanelUids,
} from '../utils';

const createDashboardSchema = z.object({
  title: z.string().describe('The title of the dashboard to create.'),
  description: z.string().describe('A description of the dashboard.'),
  panels: z
    .array(z.unknown())
    .optional()
    .describe('An array of panel configurations (PanelJSON or lens_tool_artifact).'),
  markdownContent: z
    .string()
    .describe(
      'Markdown content for a summary panel displayed at the top of the dashboard. Should describe what the dashboard shows and provide helpful context.'
    ),
});

/**
 * Dashboard state stored in the tool result for later retrieval by manage_dashboard
 */
export interface StoredDashboardState {
  title: string;
  description: string;
  markdownContent: string;
  panels: DashboardPanel[];
}

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
    description: `Create an in-memory dashboard with the specified title, description, panels, and a markdown summary.

This tool will:
1. Accept a title and description for the dashboard
2. Accept markdown content for a summary panel at the top
3. Accept an array of panel configurations
4. Generate an in-memory dashboard URL (not saved until user explicitly saves it)

The dashboard is created in edit mode so the user can review and save it.`,
    schema: createDashboardSchema,
    tags: [],
    handler: async (
      { title, description, panels, markdownContent },
      { logger, request, resultStore }
    ) => {
      try {
        // Build markdown panel and offset other panels accordingly
        const markdownPanel = buildMarkdownPanel(markdownContent);
        const yOffset = getMarkdownPanelHeight(markdownContent);
        const normalizedPanels = [markdownPanel, ...normalizePanels(panels, yOffset, resultStore)];

        // Assign unique UIDs to all panels for later reference
        const panelsWithUids = assignPanelUids(normalizedPanels);

        const spaceId = spaces?.spacesService?.getSpaceId(request);

        // Generate in-memory dashboard URL - no dashboardId means unsaved/create mode
        const dashboardUrl = await dashboardLocator.getRedirectUrl(
          {
            // No dashboardId means it will be an unsaved "create" dashboard
            panels: panelsWithUids as unknown as DashboardPanel[],
            title,
            description,
            viewMode: 'edit', // Allow user to edit and save
            // TODO: Improve time range selection
            time_range: { from: 'now-15m', to: 'now' },
          },
          { spaceId }
        );

        logger.info(`In-memory dashboard created with ${panelsWithUids.length} panels`);

        const toolResultId = getToolResultId();

        // Store dashboard state inside content for manage_dashboard to retrieve
        const storedState: StoredDashboardState = {
          title,
          description,
          markdownContent,
          panels: panelsWithUids,
        };

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: toolResultId,
              data: {
                id: toolResultId,
                title,
                content: {
                  url: dashboardUrl,
                  description,
                  panelCount: panelsWithUids.length,
                  state: storedState,
                },
              },
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
