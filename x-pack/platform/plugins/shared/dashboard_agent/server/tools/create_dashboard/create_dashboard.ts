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
import {
  checkDashboardToolsAvailability,
  normalizePanels,
  buildMarkdownPanel,
  getMarkdownPanelHeight,
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
    description: `Create a dashboard with the specified title, description, panels, and a markdown summary.

This tool will:
1. Accept a title and description for the dashboard
2. Accept markdown content for a summary panel at the top
3. Accept an array of panel configurations
4. Create a dashboard with the markdown panel followed by visualization panels`,
    schema: createDashboardSchema,
    tags: [],
    handler: async (
      { title, description, panels, markdownContent },
      { logger, request, esClient, resultStore }
    ) => {
      try {
        const coreContext = {
          savedObjects: {
            client: savedObjects.getScopedClient(request),
            typeRegistry: savedObjects.getTypeRegistry(),
          },
        };

        // Create a minimal request handler context
        const requestHandlerContext = {
          core: Promise.resolve(coreContext),
          resolve: async () => ({ core: coreContext }),
        } as unknown as RequestHandlerContext;

        // Build markdown panel and offset other panels accordingly
        const markdownPanel = buildMarkdownPanel(markdownContent);
        const yOffset = getMarkdownPanelHeight(markdownContent);
        const normalizedPanels = [markdownPanel, ...normalizePanels(panels, yOffset, resultStore)];

        const dashboardCreateResponse = await dashboard.client.create(requestHandlerContext, {
          data: { title, description, panels: normalizedPanels },
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
                  panelCount: normalizedPanels.length,
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
