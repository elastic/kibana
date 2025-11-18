/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { RequestHandlerContext, SavedObjectsServiceStart } from '@kbn/core/server';
import type { UpdateResult } from '@kbn/content-management-plugin/common';
import type { DashboardItem } from '@kbn/dashboard-plugin/server/content_management';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { getToolResultId } from '@kbn/onechat-server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import { dashboardTools } from '../../../common';
import { checkDashboardToolsAvailability } from '../utils';

// Type for the response from dashboardClient.update()
interface UpdateItemResponse<T = unknown, M = void> {
  contentTypeId: string;
  result: UpdateResult<T, M>;
}

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
  { dashboardLocator }: { dashboardLocator: LocatorPublic<DashboardAppLocatorDefinition> }
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
        const dashboardContentClient = dashboard.getContentClient();
        if (!dashboardContentClient) {
          throw new Error('Dashboard content client is not available');
        }

        // Create a minimal request handler context
        const requestHandlerContext = {
          core: Promise.resolve({
            savedObjects: {
              client: savedObjects.getScopedClient(request),
            },
            elasticsearch: {
              client: esClient,
            },
          }),
        } as unknown as RequestHandlerContext;

        const dashboardClient = dashboardContentClient.getForRequest({
          request,
          requestHandlerContext,
          version: 1,
        });

        // Build update data object with only provided fields
        const updateData: Partial<{
          title: string;
          description: string;
          panels: unknown;
        }> = {};

        if (title !== undefined) {
          updateData.title = title;
        }
        if (description !== undefined) {
          updateData.description = description;
        }
        // if (panels !== undefined) {
        //   updateData.panels = panels;
        // }

        // Update dashboard using the Dashboard plugin's client
        const response = (await dashboardClient.update(
          id,
          updateData,
          {} // options
        )) as UpdateItemResponse<DashboardItem>;

        const dashboardId = response.result.item.id;
        logger.info(`Dashboard updated successfully: ${dashboardId}`);

        const dashboardUrl = await dashboardLocator?.getRedirectUrl({
          dashboardId,
        });
        const updatedTitle = title || response.result.item.attributes.title;

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                reference: {
                  id: dashboardId,
                },
                title: updatedTitle,
                content: {
                  url: dashboardUrl,
                  description:
                    description !== undefined
                      ? description
                      : response.result.item.attributes.description || '',
                  panelCount:
                    panels !== undefined
                      ? Array.isArray(panels)
                        ? panels.length
                        : 0
                      : response.result.item.attributes.panels
                      ? response.result.item.attributes.panels.length
                      : 0,
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
