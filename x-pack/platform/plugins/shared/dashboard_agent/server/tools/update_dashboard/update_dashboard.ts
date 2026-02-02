/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { RequestHandlerContext, SavedObjectsServiceStart } from '@kbn/core/server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { DashboardAppLocator } from '@kbn/dashboard-plugin/common/locator/locator';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

import { dashboardTools } from '../../../common';
import { checkDashboardToolsAvailability, normalizePanels, buildMarkdownPanel } from '../utils';

const updateDashboardSchema = z.object({
  id: z.string().describe('The ID of the dashboard to update.'),
  title: z.string().optional().describe('The updated title of the dashboard.'),
  description: z.string().optional().describe('The updated description of the dashboard.'),
  panels: z
    .array(z.unknown())
    .describe('An array of panel configurations (PanelJSON or lens_tool_artifact) to update.'),
  markdownContent: z
    .string()
    .describe(
      'Markdown content for a summary panel displayed at the top of the dashboard. This tool replaces the existing markdown summary with this content.'
    ),
});

export const updateDashboardTool = (
  dashboard: DashboardPluginStart,
  savedObjects: SavedObjectsServiceStart,
  {
    dashboardLocator,
    spaces,
  }: { dashboardLocator: DashboardAppLocator; spaces?: SpacesPluginStart }
): BuiltinToolDefinition<typeof updateDashboardSchema> => {
  return {
    id: dashboardTools.updateDashboard,
    type: ToolType.builtin,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    description: `Update an existing dashboard by replacing its markdown summary and visualization panels.

This tool will:
1. Accept a dashboard ID, required fields (panels, markdownContent), and optional fields (title, description)
2. Build a markdown summary panel at the top
3. Replace the dashboard's panels with the markdown summary panel followed by the provided visualization panels
4. Return the updated dashboard information`,
    schema: updateDashboardSchema,
    tags: [],
    handler: async (
      { id, title, description, panels, markdownContent },
      { logger, request, esClient, resultStore }
    ) => {
      try {
        const coreContext = {
          savedObjects: { client: savedObjects.getScopedClient(request) },
        };

        // Create a minimal request handler context
        const requestHandlerContext = {
          core: Promise.resolve(coreContext),
          resolve: async () => ({ core: coreContext }),
        } as unknown as RequestHandlerContext;

        // First, read the existing dashboard to get current values
        const existingDashboard = await dashboard.client.read(requestHandlerContext, id);

        const markdownPanel = buildMarkdownPanel(markdownContent);
        const yOffset = markdownPanel.grid.h;
        const normalizedPanels = normalizePanels(panels, yOffset, resultStore);
        const updatedPanels = [markdownPanel, ...normalizedPanels];

        // Merge existing data with provided updates. Dashboard update is a full replace, so we
        // must start from the existing dashboard state and then apply changes.
        const updateData = {
          ...existingDashboard.data,
          title: title ?? existingDashboard.data.title,
          description: description ?? existingDashboard.data.description,
          panels: updatedPanels,
        };

        // Update dashboard using the Dashboard plugin's client
        const dashboardUpdateResponse = await dashboard.client.update(requestHandlerContext, id, {
          data: updateData,
        });

        logger.info(`Dashboard updated successfully: ${dashboardUpdateResponse.id}`);

        const spaceId = spaces?.spacesService?.getSpaceId(request);
        const dashboardUrl = await dashboardLocator?.getRedirectUrl(
          { dashboardId: dashboardUpdateResponse.id },
          { spaceId }
        );

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                id: dashboardUpdateResponse.id,
                title: updateData.title,
                content: {
                  url: dashboardUrl,
                  description: updateData.description ?? '',
                  panelCount: updateData.panels?.length ?? 0,
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in update_dashboard tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to update dashboard: ${error.message}`,
                metadata: { id, title, description },
              },
            },
          ],
        };
      }
    },
  };
};
