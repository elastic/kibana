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
import { checkDashboardToolsAvailability } from '../utils';

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
  {
    dashboardLocator,
    spaces,
  }: { dashboardLocator: DashboardAppLocator; spaces?: SpacesPluginStart }
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
        const dashboardsClient = dashboard.client;

        const coreContext = {
          savedObjects: { client: savedObjects.getScopedClient(request) },
        };

        // Create a minimal request handler context
        const requestHandlerContext = {
          core: Promise.resolve(coreContext),
          resolve: async () => ({ core: coreContext }),
        } as unknown as RequestHandlerContext;

        const dashboardCreateResponse = await dashboardsClient.create(requestHandlerContext, {
          data: { title, description, panels: [] as any },
        });

        logger.info(`Dashboard created successfully: ${dashboardCreateResponse.id}`);

        const spaceId = spaces?.spacesService?.getSpaceId(request);
        const dashboardUrl = await dashboardLocator?.getRedirectUrl(
          { dashboardId: dashboardCreateResponse.id },
          { spaceId }
        );

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                id: dashboardCreateResponse.id,
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
