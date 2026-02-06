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
import { getToolResultId } from '@kbn/agent-builder-server';
import type { DashboardAppLocator } from '@kbn/dashboard-plugin/common/locator/locator';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

import { dashboardTools, DASHBOARD_EVENTS, type DashboardFinalizedData } from '../../../common';
import {
  checkDashboardToolsAvailability,
  normalizePanels,
  buildMarkdownPanel,
  getMarkdownPanelHeight,
} from '../utils';

const finalizeDashboardSchema = z.object({
  title: z.string().describe('The title of the dashboard.'),
  description: z.string().describe('A description of the dashboard.'),
  markdownContent: z
    .string()
    .describe(
      'Markdown content for a summary panel displayed at the top of the dashboard. Should describe what the dashboard shows.'
    ),
  panels: z
    .array(z.unknown())
    .describe(
      'Array of panel configurations (visualization configs or tool_result_ids from createVisualization calls).'
    ),
});

export const finalizeDashboardTool = ({
  dashboardLocator,
  spaces,
}: {
  dashboardLocator: DashboardAppLocator;
  spaces?: SpacesPluginStart;
}): BuiltinToolDefinition<typeof finalizeDashboardSchema> => {
  return {
    id: dashboardTools.finalizeDashboard,
    type: ToolType.builtin,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    description: `Finalize the dashboard preview and generate a link for the user.

Call this after adding all panels with addPanel. This will:
1. Generate a link to an unsaved dashboard with all the panels
2. The user can navigate to the link to view and save the dashboard themselves

IMPORTANT: Pass all the panels you added during the session. This is the final step.`,
    schema: finalizeDashboardSchema,
    tags: [],
    handler: async (
      { title, description, markdownContent, panels },
      { logger, request, events, resultStore }
    ) => {
      try {
        // Build markdown panel and offset other panels accordingly
        const markdownPanel = buildMarkdownPanel(markdownContent);
        const yOffset = getMarkdownPanelHeight(markdownContent);
        const normalizedPanels = [markdownPanel, ...normalizePanels(panels, yOffset, resultStore)];

        logger.info(`Generating unsaved dashboard link: ${title}`);

        const spaceId = spaces?.spacesService?.getSpaceId(request);

        // Generate URL for unsaved dashboard (no dashboardId = creates new)
        const dashboardUrl = await dashboardLocator?.getRedirectUrl(
          {
            // No dashboardId means it will be an unsaved "create" dashboard
            panels: normalizedPanels as any,
            title,
            description,
            viewMode: 'edit', // Allow user to edit and save
            // TODO: Improve time range selection
            time_range: { from: 'now-15m', to: 'now' },
          },
          { spaceId }
        );

        // Emit finalized event so UI can update
        events.sendUiEvent<typeof DASHBOARD_EVENTS.FINALIZED, DashboardFinalizedData>(
          DASHBOARD_EVENTS.FINALIZED,
          {
            dashboardId: '', // No ID since it's unsaved
            url: dashboardUrl ?? '',
          }
        );

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                id: 'unsaved',
                title,
                content: {
                  url: dashboardUrl,
                  description,
                  panelCount: normalizedPanels.length,
                  note: 'This is an unsaved dashboard. Click the link to view and save it.',
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in finalize_dashboard tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to finalize dashboard: ${error.message}`,
                metadata: { title, description },
              },
            },
          ],
        };
      }
    },
  };
};
