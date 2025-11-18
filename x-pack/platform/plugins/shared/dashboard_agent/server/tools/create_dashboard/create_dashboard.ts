/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { RequestHandlerContext, SavedObjectsServiceStart } from '@kbn/core/server';
import type { CreateResult } from '@kbn/content-management-plugin/common';
import type { DashboardItem } from '@kbn/dashboard-plugin/server/content_management';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { getToolResultId } from '@kbn/onechat-server';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import { dashboardTools } from '../../../common';
import { checkDashboardToolsAvailability } from '../utils';

// Type for the response from dashboardClient.create()
// The content management client wraps the CreateResult in a response object
interface CreateItemResponse<T = unknown, M = void> {
  contentTypeId: string;
  result: CreateResult<T, M>;
}

const createDashboardSchema = z.object({
  title: z.string().describe('The title of the dashboard to create.'),
  description: z.string().describe('A description of the dashboard.'),
  panels: z
    .array(z.unknown())
    .optional()
    .describe('An array of panel configurations (PanelJSON or lens_tool_artifact).'),
});

export const createDashboardTool = (
  dashboard: DashboardPluginStart,
  savedObjects: SavedObjectsServiceStart,
  { dashboardLocator }: { dashboardLocator: LocatorPublic<DashboardAppLocatorDefinition> }
): BuiltinToolDefinition<typeof createDashboardSchema> => {
  return {
    id: dashboardTools.createDashboard,
    type: ToolType.builtin,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    description: `Create a dashboard with the specified title, description, and panels.

This tool will:
1. Accept a title and description for the dashboard
2. Accept an array of panel configurations
3. Create a dashboard with the provided configuration`,
    schema: createDashboardSchema,
    tags: [],
    handler: async ({ title, description, panels, ...rest }, { logger, request, esClient }) => {
      try {
        // @TODO: remove
        console.log(`--@@panels\n`, JSON.stringify(panels, null, 2));
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

        // Create dashboard using the Dashboard plugin's client
        // The create method expects DashboardAttributes directly, not wrapped in { attributes: ... }
        // The response structure is: { contentTypeId: string, result: { item: DashboardItem, meta?: any } }
        const response = (await dashboardClient.create(
          {
            title,
            description,
            panels: panels || [],
          },
          {} // options
        )) as CreateItemResponse<DashboardItem>;

        // eslint-disable-next-line no-console
        console.log('Dashboard creation response:', JSON.stringify(response, null, 2));

        const dashboardId = response.result.item.id;
        logger.info(`Dashboard created successfully: ${dashboardId}`);

        const dashboardUrl = await dashboardLocator?.getRedirectUrl({
          dashboardId,
        });

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                reference: {
                  id: dashboardId,
                },
                title,
                content: {
                  url: dashboardUrl,
                  description,
                  panelCount: panels?.length || 0,
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
