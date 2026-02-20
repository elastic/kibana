/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANELS_REMOVED_EVENT,
  type AttachmentPanel,
  type DashboardUiEvent,
  type PanelAddedEventData,
  type PanelsRemovedEventData,
} from '@kbn/dashboard-agent-common';

import { dashboardTools } from '../../../common';
import { checkDashboardToolsAvailability } from '../utils';
import {
  retrieveLatestVersion,
  getErrorMessage,
  resolveExistingVisualizations,
  upsertMarkdownPanel,
  getRemovedPanels,
  type VisualizationFailure,
} from './utils';
import {
  buildVisualizationsFromQueriesWithLLM,
  type VisualizationQueryInput,
} from './visualization_generation';

/**
 * Input schema for generating a visualization from natural language.
 */
const visualizationQuerySchema = z.object({
  query: z.string().describe('A natural language query describing the desired visualization.'),
  index: z.string().optional().describe('(optional) Index, alias, or datastream to target.'),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe('(optional) The type of chart to create.'),
  esql: z.string().optional().describe('(optional) An ES|QL query to use for the visualization.'),
}) satisfies z.ZodType<VisualizationQueryInput>;

const manageDashboardSchema = z.object({
  dashboardAttachmentId: z
    .string()
    .optional()
    .describe(
      '(optional) The dashboard attachment ID to modify. If not provided, a new dashboard is created.'
    ),
  title: z
    .string()
    .optional()
    .describe('The title for the dashboard. Required when creating a new dashboard.'),
  description: z
    .string()
    .optional()
    .describe('The description for the dashboard. Required when creating a new dashboard.'),
  markdownContent: z
    .string()
    .optional()
    .describe('(optional) Markdown content for a summary panel at the top of the dashboard.'),
  visualizationQueries: z
    .array(visualizationQuerySchema)
    .optional()
    .describe(
      '(optional) Array of natural language queries to generate new visualizations using LLM.'
    ),
  existingVisualizationIds: z
    .array(z.string())
    .optional()
    .describe('(optional) Array of existing visualization attachment IDs to add to the dashboard.'),
  removePanelIds: z
    .array(z.string())
    .optional()
    .describe('(optional) Array of panel IDs to remove from the dashboard.'),
});

export const manageDashboardTool = ({}: {}): BuiltinToolDefinition<
  typeof manageDashboardSchema
> => {
  return {
    id: dashboardTools.manageDashboard,
    type: ToolType.builtin,
    availability: {
      cacheMode: 'space',
      handler: checkDashboardToolsAvailability,
    },
    description: `Create or update an in-memory dashboard with visualizations.

This tool can:
1. Create a new dashboard (when dashboardAttachmentId is not provided)
2. Update an existing dashboard (when dashboardAttachmentId is provided)
3. Add inline visualizations by describing them in natural language
4. Add existing visualization attachments by ID
5. Add markdown panels
6. Remove panels by their panel ID

When creating a new dashboard, title and description are required.
When updating, all fields are optional and only the provided ones are updated.

The tool emits UI events (dashboard:panel_added, dashboard:panels_removed) that can be used by the dashboard app to update its state in real-time.`,
    schema: manageDashboardSchema,
    tags: [],
    handler: async (
      {
        dashboardAttachmentId: previousAttachmentId,
        title,
        description,
        markdownContent,
        visualizationQueries,
        existingVisualizationIds,
        removePanelIds,
      },
      { logger, attachments, esClient, modelProvider, events }
    ) => {
      try {
        const latestVersion = retrieveLatestVersion(attachments, previousAttachmentId);
        const isNewDashboard = !latestVersion;

        const sendIncrementalEvents = (
          panels: AttachmentPanel[],
          eventType: DashboardUiEvent['data']['custom_event']
        ) => {
          if (panels.length === 0) {
            return;
          }

          if (eventType === DASHBOARD_PANELS_REMOVED_EVENT) {
            const removedPayload: PanelsRemovedEventData = {
              dashboardAttachmentId,
              panelIds: panels.map(({ panelId }) => panelId),
            };
            events.sendUiEvent(DASHBOARD_PANELS_REMOVED_EVENT, removedPayload);
            return;
          }

          if (eventType === DASHBOARD_PANEL_ADDED_EVENT) {
            for (const panel of panels) {
              const addedPayload: PanelAddedEventData = {
                dashboardAttachmentId,
                panel,
              };
              events.sendUiEvent(DASHBOARD_PANEL_ADDED_EVENT, addedPayload);
            }
            return;
          }
        };

        if (isNewDashboard && (!title || !description)) {
          logger.error('Title and description are required when creating a new dashboard.');
          return noTitleOrDescriptionErrorResult;
        }

        const dashboardAttachmentId = previousAttachmentId ?? uuidv4();
        let panels: AttachmentPanel[] = [...(latestVersion?.data.panels ?? [])];
        // Track failures to report to the user
        const failures: VisualizationFailure[] = [];

        const markdownPanelUpdate = upsertMarkdownPanel(panels, markdownContent);
        panels = markdownPanelUpdate.panels;

        if (markdownPanelUpdate.changedPanel) {
          sendIncrementalEvents([markdownPanelUpdate.changedPanel], DASHBOARD_PANEL_ADDED_EVENT);
        }

        const { panelsToRemove, panelsToKeep } = getRemovedPanels(panels, removePanelIds);

        if (panelsToRemove.length > 0) {
          panels = panelsToKeep;
          // Emit panels removed events
          sendIncrementalEvents(panelsToRemove, DASHBOARD_PANELS_REMOVED_EVENT);
          logger.debug(`Removed ${panelsToRemove.length} panels from dashboard`);
        }

        const existingVisualizations = await resolveExistingVisualizations({
          visualizationIds: existingVisualizationIds,
          attachments,
          logger,
        });
        panels.push(...existingVisualizations.panels);
        failures.push(...existingVisualizations.failures);
        sendIncrementalEvents(existingVisualizations.panels, DASHBOARD_PANEL_ADDED_EVENT);

        // Generate new visualizations from queries (slow - requires LLM)
        const llmVisualizations = await buildVisualizationsFromQueriesWithLLM({
          queries: visualizationQueries,
          modelProvider,
          esClient,
          events,
          sendIncrementalEvents,
          logger,
        });
        panels.push(...llmVisualizations.panels);
        failures.push(...llmVisualizations.failures);

        const attachmentInput = {
          id: dashboardAttachmentId,
          type: DASHBOARD_ATTACHMENT_TYPE,
          description: `Dashboard: ${title ?? latestVersion?.data.title}`,
          data: {
            title: title ?? latestVersion?.data.title,
            description: description ?? latestVersion?.data.description,
            panels,
          },
        };

        const attachment = isNewDashboard
          ? await attachments.add(attachmentInput)
          : await attachments.update(dashboardAttachmentId, attachmentInput);

        logger.info(
          `Dashboard ${isNewDashboard ? 'created' : 'updated'} with ${panels.length} panels`
        );

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                version: attachment?.current_version ?? 1,
                failures: failures.length > 0 ? failures : undefined,
                dashboardAttachment: {
                  id: attachment?.id,
                  content: {
                    ...attachmentInput.data,
                    panels: attachmentInput.data.panels.map(
                      ({ type, panelId, title: panelTitle }) => ({
                        type,
                        panelId,
                        title: panelTitle ?? '',
                      })
                    ),
                  },
                },
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        logger.error(`Error in manage_dashboard tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to manage dashboard: ${errorMessage}`,
                metadata: {
                  title,
                  description,
                  dashboardAttachmentId: previousAttachmentId,
                },
              },
            },
          ],
        };
      }
    },
  };
};

const noTitleOrDescriptionErrorResult = {
  results: [
    {
      type: ToolResultType.error,
      data: {
        message: 'Title and description are required when creating a new dashboard.',
      },
    },
  ],
};
