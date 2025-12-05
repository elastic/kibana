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
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/common/constants';

import { dashboardTools } from '../../../common';
import {
  checkDashboardToolsAvailability,
  normalizePanels,
  buildMarkdownPanel,
  getMarkdownPanelHeight,
  filterOutMarkdownPanels,
} from '../utils';

const updateDashboardSchema = z.object({
  id: z.string().describe('The ID of the dashboard to update.'),
  title: z.string().optional().describe('The updated title of the dashboard.'),
  description: z.string().optional().describe('The updated description of the dashboard.'),
  panels: z
    .unknown()
    .optional()
    .describe('An array of panel configurations (PanelJSON or lens_tool_artifact) to update.'),
  markdownContent: z
    .string()
    .optional()
    .describe(
      'Markdown content for a summary panel displayed at the top of the dashboard. If provided, replaces any existing markdown summary.'
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
    description: `Update an existing dashboard with new title, description, panels, or markdown summary.

This tool will:
1. Accept a dashboard ID and optional fields to update (title, description, panels, markdownContent)
2. If markdownContent is provided, add a markdown summary panel at the top
3. Update the dashboard with the provided configuration
4. Return the updated dashboard information`,
    schema: updateDashboardSchema,
    tags: [],
    handler: async (
      { id, title, description, panels, markdownContent },
      { logger, request, esClient }
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

        // Build panels with optional markdown panel prepended
        let updatedPanels = existingDashboard.data.panels;
        if (panels !== undefined || markdownContent !== undefined) {
          const existingPanels = existingDashboard.data.panels ?? [];
          const existingMarkdownPanel = existingPanels.find(
            (item) => 'type' in item && item.type === MARKDOWN_EMBEDDABLE_TYPE
          );
          const existingNonMarkdownPanels = filterOutMarkdownPanels(existingPanels);

          // Determine the markdown panel to use (new takes precedence over existing)
          const markdownPanelToUse = markdownContent
            ? buildMarkdownPanel(markdownContent)
            : existingMarkdownPanel;

          // Calculate y offset for positioning new panels
          const yOffset = markdownContent
            ? getMarkdownPanelHeight(markdownContent)
            : existingMarkdownPanel && 'h' in existingMarkdownPanel.grid
            ? existingMarkdownPanel.grid.h
            : 0;

          // Use new panels if provided, otherwise keep existing non-markdown panels
          const basePanels =
            panels !== undefined
              ? normalizePanels(panels as unknown[], yOffset)
              : existingNonMarkdownPanels;

          // Combine: markdown panel (if any) + base panels
          updatedPanels = markdownPanelToUse ? [markdownPanelToUse, ...basePanels] : basePanels;
        }

        // Merge existing data with provided updates
        const updateData = {
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
