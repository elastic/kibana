/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { RequestHandlerContext, SavedObjectsServiceStart } from '@kbn/core/server';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { getToolResultId } from '@kbn/onechat-server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { DashboardAppLocator } from '@kbn/dashboard-plugin/common/locator/locator';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

import { dashboardTools } from '../../../common';
import { checkDashboardToolsAvailability, normalizePanels } from '../utils';

const updateDashboardSchema = z.object({
  id: z.string().describe('The ID of the dashboard to update.'),
  title: z.string().optional().describe('The updated title of the dashboard.'),
  description: z.string().optional().describe('The updated description of the dashboard.'),
  panels: z
    .unknown()
    .optional()
    .describe('An array of panel configurations (PanelJSON or lens_tool_artifact) to update.'),
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
    description: `Update an existing dashboard with new title, description, or panels.

This tool will:
1. Accept a dashboard ID and optional fields to update (title, description, panels)
2. Update the dashboard with the provided configuration
3. Return the updated dashboard information`,
    schema: updateDashboardSchema,
    tags: [],
    handler: async ({ id, title, description, panels, ...rest }, { logger, request, esClient }) => {
      try {
        const dashboardsClient = dashboard.client;

        const coreContext = {
          savedObjects: { client: savedObjects.getScopedClient(request) },
        };

        // Create a minimal request handler context
        const requestHandlerContext = {
          core: Promise.resolve(coreContext),
          resolve: async () => ({ core: coreContext }),
        } as unknown as RequestHandlerContext;

        // First, read the existing dashboard to get current values
        const existingDashboard = await dashboardsClient.read(requestHandlerContext, id);

        const normalizedPanels =
          panels !== undefined ? normalizePanels(panels as unknown[]) : undefined;

        // Merge existing data with provided updates
        const updateData = {
          title: title ?? existingDashboard.data.title,
          description: description ?? existingDashboard.data.description,
          panels: normalizedPanels ?? existingDashboard.data.panels,
        };

        // Update dashboard using the Dashboard plugin's client
        const dashboardUpdateResponse = await dashboardsClient.update(requestHandlerContext, id, {
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
                  panelCount: updateData.panels.length,
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
