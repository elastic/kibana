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
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';

import { dashboardTools } from '../../../common';
import type { StoredDashboardState } from '../create_dashboard/create_dashboard';
import {
  checkDashboardToolsAvailability,
  normalizePanels,
  buildMarkdownPanel,
  getMarkdownPanelHeight,
  assignPanelUids,
  removePanelsByUids,
  filterOutMarkdownPanels,
} from '../utils';

const manageDashboardSchema = z.object({
  toolResultId: z
    .string()
    .describe(
      'The tool_result_id from a previous create_dashboard or manage_dashboard call. This references the dashboard state to modify.'
    ),
  title: z.string().optional().describe('(optional) Updated title for the dashboard.'),
  description: z.string().optional().describe('(optional) Updated description for the dashboard.'),
  markdownContent: z
    .string()
    .optional()
    .describe(
      '(optional) Updated markdown content for the summary panel. If not provided, the existing markdown is preserved.'
    ),
  panelsToAdd: z
    .array(z.unknown())
    .optional()
    .describe(
      '(optional) Array of panel configurations or tool_result_ids to add to the dashboard.'
    ),
  panelsToRemove: z
    .array(z.string())
    .optional()
    .describe('(optional) Array of panel UIDs to remove from the dashboard.'),
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
    description: `Incrementally update an in-memory dashboard by adding or removing panels, or updating metadata.

This tool will:
1. Read the previous dashboard state from the provided tool_result_id
2. Apply incremental changes (add/remove panels, update title/description/markdown)
3. Generate a new in-memory dashboard URL with the updated state
4. Return a new tool_result_id for subsequent modifications

Use this tool when you need to:
- Add new visualizations to an existing dashboard
- Remove panels from a dashboard
- Update dashboard title, description, or markdown summary`,
    schema: manageDashboardSchema,
    tags: [],
    handler: async (
      { toolResultId, title, description, markdownContent, panelsToAdd, panelsToRemove },
      { logger, request, resultStore }
    ) => {
      try {
        if (!isToolResultId(toolResultId)) {
          throw new Error(
            `Invalid toolResultId "${toolResultId}". Expected a tool_result_id from a previous create_dashboard or manage_dashboard call.`
          );
        }

        if (!resultStore.has(toolResultId)) {
          throw new Error(
            `Dashboard state not found for toolResultId "${toolResultId}". Make sure you're using a tool_result_id from a previous dashboard operation.`
          );
        }

        const storedResult = resultStore.get(toolResultId);
        if (storedResult.type !== ToolResultType.dashboard) {
          throw new Error(
            `The provided toolResultId "${toolResultId}" is not a dashboard result (got "${storedResult.type}").`
          );
        }

        // Extract the stored dashboard state from content.state
        // DashboardResult.data has type: { id, title, content: Record<string, unknown> }
        const content = storedResult.data.content as { state?: StoredDashboardState };
        if (!content?.state) {
          throw new Error(
            `Dashboard state not found in content for toolResultId "${toolResultId}". The dashboard may have been created with an older version.`
          );
        }
        const previousState = content.state;

        // Start with the previous state
        const updatedTitle = title ?? previousState.title;
        const updatedDescription = description ?? previousState.description;
        const updatedMarkdownContent = markdownContent ?? previousState.markdownContent;

        // Get current panels, filtering out the markdown panel (we'll rebuild it)
        let currentPanels = filterOutMarkdownPanels(previousState.panels) as DashboardPanel[];

        // Remove panels if specified
        if (panelsToRemove && panelsToRemove.length > 0) {
          currentPanels = removePanelsByUids(currentPanels, panelsToRemove);
          logger.debug(`Removed ${panelsToRemove.length} panels from dashboard`);
        }

        // Add new panels if specified
        if (panelsToAdd && panelsToAdd.length > 0) {
          // Calculate the Y offset for new panels (below existing panels)
          const maxY = currentPanels.reduce((max, panel) => {
            const panelBottom = panel.grid.y + panel.grid.h;
            return Math.max(max, panelBottom);
          }, 0);

          const newPanels = normalizePanels(panelsToAdd, maxY, resultStore);
          currentPanels = [...currentPanels, ...newPanels];
          logger.debug(`Added ${panelsToAdd.length} new panels to dashboard`);
        }

        // Build the new markdown panel and offset all visualization panels accordingly
        const markdownPanel = buildMarkdownPanel(updatedMarkdownContent);
        const yOffset = getMarkdownPanelHeight(updatedMarkdownContent);

        // Shift all non-markdown panels down to accommodate the markdown panel
        const shiftedPanels = currentPanels.map((panel) => ({
          ...panel,
          grid: {
            ...panel.grid,
            y: panel.grid.y + yOffset,
          },
        }));

        const finalPanels = [markdownPanel, ...shiftedPanels];

        // Assign unique UIDs to any panels that don't have them
        const panelsWithUids = assignPanelUids(finalPanels);

        const spaceId = spaces?.spacesService?.getSpaceId(request);

        // Generate new in-memory dashboard URL
        const dashboardUrl = await dashboardLocator.getRedirectUrl(
          {
            panels: panelsWithUids as unknown as DashboardPanel[],
            title: updatedTitle,
            description: updatedDescription,
            viewMode: 'edit',
            time_range: { from: 'now-15m', to: 'now' },
          },
          { spaceId }
        );

        logger.info(`Dashboard updated with ${panelsWithUids.length} panels`);

        const newToolResultId = getToolResultId();

        // Store the updated dashboard state for future manage_dashboard calls
        const storedState: StoredDashboardState = {
          title: updatedTitle,
          description: updatedDescription,
          markdownContent: updatedMarkdownContent,
          panels: panelsWithUids,
        };

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: newToolResultId,
              data: {
                id: newToolResultId,
                title: updatedTitle,
                content: {
                  url: dashboardUrl,
                  description: updatedDescription,
                  panelCount: panelsWithUids.length,
                  state: storedState,
                },
              },
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
                metadata: { toolResultId, title, description },
              },
            },
          ],
        };
      }
    },
  };
};
