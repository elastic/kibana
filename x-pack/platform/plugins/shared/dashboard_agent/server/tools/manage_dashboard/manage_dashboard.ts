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
import { DASHBOARD_ATTACHMENT_TYPE, type DashboardAttachmentData } from '../../attachment_types';

const manageDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .describe(
      'The dashboard attachment ID to modify, returned by a previous create_dashboard or manage_dashboard call.'
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
      '(optional) Array of attachment_ids from create_visualizations calls to add to the dashboard.'
    ),
  visualizationsToRemove: z
    .array(z.string())
    .optional()
    .describe('(optional) Array of visualization attachment_ids to remove from the dashboard.'),
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
1. Read the previous dashboard state from the provided dashboardAttachmentId
2. Apply incremental changes (add/remove visualizations, update title/description/markdown)
3. Generate a new in-memory dashboard URL with the updated state
4. Update the dashboard attachment with the new state

Use this tool when you need to:
- Add new visualizations to an existing dashboard
- Remove visualizations from a dashboard
- Update dashboard title, description, or markdown summary`,
    schema: manageDashboardSchema,
    tags: [],
    handler: async (
      {
        dashboardAttachmentId,
        title,
        description,
        markdownContent,
        visualizationsToAdd,
        visualizationsToRemove,
      },
      { logger, request, attachments }
    ) => {
      try {
        const dashboardAttachment = attachments.get(dashboardAttachmentId);

        if (!dashboardAttachment) {
          throw new Error(
            `Dashboard attachment "${dashboardAttachmentId}" not found. Make sure you're using a dashboardAttachmentId from a previous create_dashboard or manage_dashboard call.`
          );
        }

        if (dashboardAttachment.type !== DASHBOARD_ATTACHMENT_TYPE) {
          throw new Error(
            `Attachment "${dashboardAttachmentId}" is not a dashboard attachment (got "${dashboardAttachment.type}").`
          );
        }

        // Get the latest version of the dashboard attachment
        const latestVersion = attachments.getLatest(dashboardAttachmentId);
        if (!latestVersion) {
          throw new Error(
            `Could not retrieve latest version of dashboard attachment "${dashboardAttachmentId}".`
          );
        }

        const previousData = latestVersion.data as DashboardAttachmentData;

        // Start with the previous state
        const updatedTitle = title ?? previousData.title;
        const updatedDescription = description ?? previousData.description;
        const updatedMarkdownContent = markdownContent ?? previousData.markdownContent;

        // Work with visualization IDs directly
        let visualizationIds = [...previousData.visualizationIds];

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
          ...normalizePanels(visualizationIds, yOffset, attachments),
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

        // Update the dashboard attachment with new state
        const updatedDashboardData: DashboardAttachmentData = {
          title: updatedTitle,
          description: updatedDescription,
          markdownContent: updatedMarkdownContent,
          visualizationIds,
        };

        const updatedAttachment = await attachments.update(dashboardAttachmentId, {
          data: updatedDashboardData,
          description: `Dashboard: ${updatedTitle}`,
        });

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              data: {
                dashboardAttachmentId,
                version: updatedAttachment?.current_version ?? latestVersion.version + 1,
                url: dashboardUrl,
                title: updatedTitle,
                description: updatedDescription,
                markdownContent: updatedMarkdownContent,
                panelCount: dashboardPanels.length,
                visualizationIds,
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
                metadata: { dashboardAttachmentId, title, description },
              },
            },
          ],
        };
      }
    },
  };
};
