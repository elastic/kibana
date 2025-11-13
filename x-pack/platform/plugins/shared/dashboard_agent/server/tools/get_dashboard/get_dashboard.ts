/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { RequestHandlerContext, SavedObjectsServiceStart } from '@kbn/core/server';
import type { GetResult } from '@kbn/content-management-plugin/common';
import type { DashboardItem } from '@kbn/dashboard-plugin/server/content_management';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { getToolResultId } from '@kbn/onechat-server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import { dashboardTools } from '../../../common';

// Type for the response from dashboardClient.get()
interface GetItemResponse<T = unknown, M = void> {
  contentTypeId: string;
  result: GetResult<T, M>;
}

const getDashboardSchema = z.object({
  id: z.string().describe('The ID of the dashboard to retrieve.'),
});

export const getDashboardTool = (
  dashboard: DashboardPluginStart,
  savedObjects: SavedObjectsServiceStart,
  { dashboardLocator }: { dashboardLocator: LocatorPublic<DashboardAppLocatorDefinition> }
): BuiltinToolDefinition<typeof getDashboardSchema> => {
  return {
    id: dashboardTools.getDashboard,
    type: ToolType.builtin,
    description: `Retrieve a dashboard by its ID.

This tool will:
1. Accept a dashboard ID
2. Retrieve the dashboard with its full configuration including title, description, and panels
3. Return the dashboard information:
  - url: The URL of the dashboard
  - title: The title of the dashboard
  - description: The description of the dashboard
  - panels: The panels of the dashboard`,
    schema: getDashboardSchema,
    tags: [],
    handler: async ({ id }, { logger, request, esClient }) => {
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

        // Get dashboard using the Dashboard plugin's client
        const response = (await dashboardClient.get(id, {})) as GetItemResponse<DashboardItem>;
        const dashboardItem = response.result.item;
        logger.info(`Dashboard retrieved successfully: ${dashboardItem.id}}`);

        const dashboardUrl = await dashboardLocator?.getRedirectUrl({
          dashboardId: dashboardItem.id,
        });

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                url: dashboardUrl,
                title: dashboardItem.attributes.title,
                description: dashboardItem.attributes.description,
                panels: response.panels,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in get_dashboard tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to get dashboard: ${error.message}`,
                metadata: { id },
              },
            },
          ],
        };
      }
    },
  };
};
