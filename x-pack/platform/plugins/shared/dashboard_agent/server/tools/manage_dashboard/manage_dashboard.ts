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
import { getToolResultId, isToolResultId } from '@kbn/agent-builder-server';
import type { DashboardAppLocator } from '@kbn/dashboard-plugin/common/locator/locator';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

import { dashboardTools } from '../../../common';
import {
  checkDashboardToolsAvailability,
  normalizePanels,
  buildMarkdownPanel,
  getMarkdownPanelHeight,
  filterVisualizationIds,
} from '../utils';
import type { DashboardContent } from '../types';

const manageDashboardSchema = z.object({
  dashboardId: z
    .string()
    .describe(
      'The ID of the dashboard to modify, returned by a previous create_dashboard or manage_dashboard call.'
    ),
  title: z.string().optional().describe('(optional) Updated title for the dashboard.'),
  description: z.string().optional().describe('(optional) Updated description for the dashboard.'),
  markdownContent: z
    .string()
    .optional()
    .describe(
      '(optional) Updated markdown content for the summary panel. If not provided, the existing markdown is preserved.'
    ),
  visualizationsToAdd: z
    .array(z.string())
    .optional()
    .describe(
      '(optional) Array of tool_result_ids from create_visualizations calls to add to the dashboard.'
    ),
  visualizationsToRemove: z
    .array(z.string())
    .optional()
    .describe(
      '(optional) Array of tool_result_ids to remove from the dashboard. These are the same IDs returned by create_visualizations.'
    ),
});

export const manageDashboardTool = ({
  dashboardLocator,
  spaces,
}: {
  dashboardLocator: DashboardAppLocator;
  spaces?: SpacesPluginStart;
}): BuiltinToolDefinition<typeof manageDashboardSchema> => {
  return {
    id: dashboardTools.manageDashboard,
    type: ToolType.builtin,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    description: `Incrementally update an in-memory dashboard by adding or removing visualizations, or updating metadata.

This tool will:
1. Read the previous dashboard state from the provided dashboardId
2. Apply incremental changes (add/remove visualizations, update title/description/markdown)
3. Generate a new in-memory dashboard URL with the updated state
4. Return a new dashboard ID for subsequent modifications

Use this tool when you need to:
- Add new visualizations to an existing dashboard
- Remove visualizations from a dashboard
- Update dashboard title, description, or markdown summary`,
    schema: manageDashboardSchema,
    tags: [],
    handler: async (
      {
        dashboardId,
        title,
        description,
        markdownContent,
        visualizationsToAdd,
        visualizationsToRemove,
      },
      { logger, request, resultStore }
    ) => {
      try {
        if (!isToolResultId(dashboardId)) {
          throw new Error(
            `Invalid dashboardId "${dashboardId}". Expected an ID from a previous create_dashboard or manage_dashboard call.`
          );
        }

        if (!resultStore.has(dashboardId)) {
          throw new Error(
            `Dashboard not found for ID "${dashboardId}". Make sure you're using an ID from a previous dashboard operation.`
          );
        }

        const storedResult = resultStore.get(dashboardId);
        if (storedResult.type !== ToolResultType.dashboard) {
          throw new Error(
            `The provided dashboardId "${dashboardId}" is not a dashboard (got "${storedResult.type}").`
          );
        }

        // Extract the stored dashboard content
        const previousContent = storedResult.data.content;

        // Start with the previous state
        const updatedTitle = title ?? previousContent.title;
        const updatedDescription = description ?? previousContent.description;
        const updatedMarkdownContent = markdownContent ?? previousContent.markdownContent;

        // Work with visualization IDs directly
        let visualizationIds = [...previousContent.visualizationIds];

        // Remove visualizations if specified
        if (visualizationsToRemove && visualizationsToRemove.length > 0) {
          visualizationIds = filterVisualizationIds(visualizationIds, visualizationsToRemove);
          logger.debug(`Removed ${visualizationsToRemove.length} visualizations from dashboard`);
        }

        // Add new visualizations if specified
        if (visualizationsToAdd && visualizationsToAdd.length > 0) {
          visualizationIds = [...visualizationIds, ...visualizationsToAdd];
          logger.debug(`Added ${visualizationsToAdd.length} visualizations to dashboard`);
        }

        // Build markdown panel and visualization panels
        const markdownPanel = buildMarkdownPanel(updatedMarkdownContent);
        const yOffset = getMarkdownPanelHeight(updatedMarkdownContent);
        const dashboardPanels = [
          markdownPanel,
          ...normalizePanels(visualizationIds, yOffset, resultStore),
        ];

        const spaceId = spaces?.spacesService?.getSpaceId(request);

        // Generate new in-memory dashboard URL
        const dashboardUrl = await dashboardLocator.getRedirectUrl(
          {
            panels: dashboardPanels,
            title: updatedTitle,
            description: updatedDescription,
            viewMode: 'edit',
            time_range: { from: 'now-15m', to: 'now' },
          },
          { spaceId }
        );

        logger.info(`Dashboard updated with ${dashboardPanels.length} panels`);

        const newToolResultId = getToolResultId();

        const content: DashboardContent = {
          url: dashboardUrl,
          title: updatedTitle,
          description: updatedDescription,
          markdownContent: updatedMarkdownContent,
          panelCount: dashboardPanels.length,
          visualizationIds,
        };

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: newToolResultId,
              data: { content },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in manage_dashboard tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to manage dashboard: ${error.message}`,
                metadata: { dashboardId, title, description },
              },
            },
          ],
        };
      }
    },
  };
};
