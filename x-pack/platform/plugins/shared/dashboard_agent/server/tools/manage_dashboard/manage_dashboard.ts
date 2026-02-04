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
import type { DashboardAppLocator } from '@kbn/dashboard-plugin/common/locator/locator';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  createVisualizationGraph,
  guessChartType,
  getSchemaForChartType,
} from '@kbn/agent-builder-platform-plugin/server';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANEL_REMOVED_EVENT,
  type DashboardAttachmentData,
  type AttachmentPanel,
  type LensAttachmentPanel,
} from '@kbn/dashboard-agent-common';

import { dashboardTools } from '../../../common';
import {
  checkDashboardToolsAvailability,
  normalizePanels,
  buildMarkdownPanel,
  getMarkdownPanelHeight,
  resolveLensConfigFromAttachment,
} from '../utils';

export { DASHBOARD_PANEL_ADDED_EVENT, DASHBOARD_PANEL_REMOVED_EVENT };

/**
 * Helper to extract panel ID from any panel entry type.
 */
const getPanelId = (panel: AttachmentPanel): string => {
  return panel.panelId;
};

/**
 * Input schema for inline visualization creation.
 */
const inlineVisualizationInputSchema = z.object({
  query: z.string().describe('A natural language query describing the desired visualization.'),
  index: z.string().optional().describe('(optional) Index, alias, or datastream to target.'),
  chartType: z
    .nativeEnum(SupportedChartType)
    .optional()
    .describe('(optional) The type of chart to create.'),
  esql: z.string().optional().describe('(optional) An ES|QL query to use for the visualization.'),
});

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
  addVisualizations: z
    .array(inlineVisualizationInputSchema)
    .optional()
    .describe(
      '(optional) Array of visualization configurations to create inline and add to the dashboard.'
    ),
  addVisualizationAttachments: z
    .array(z.string())
    .optional()
    .describe('(optional) Array of existing visualization attachment IDs to add to the dashboard.'),
  removePanelIds: z
    .array(z.string())
    .optional()
    .describe('(optional) Array of panel IDs to remove from the dashboard.'),
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
    description: `Create or update an in-memory dashboard with visualizations.

This tool can:
1. Create a new dashboard (when dashboardAttachmentId is not provided)
2. Update an existing dashboard (when dashboardAttachmentId is provided)
3. Add inline visualizations by describing them in natural language
4. Add existing visualization attachments by ID
5. Remove panels by their panel ID

When creating a new dashboard, title and description are required.
When updating, all fields are optional and only the provided ones are updated.

The tool emits UI events (dashboard:panel_added, dashboard:panel_removed) that can be used by the dashboard app to update its state in real-time.`,
    schema: manageDashboardSchema,
    tags: [],
    handler: async (
      {
        dashboardAttachmentId,
        title,
        description,
        markdownContent,
        addVisualizations,
        addVisualizationAttachments,
        removePanelIds,
      },
      { logger, request, attachments, esClient, modelProvider, events }
    ) => {
      try {
        const isNewDashboard = !dashboardAttachmentId;
        let currentAttachmentId = dashboardAttachmentId;
        let previousData: DashboardAttachmentData | undefined;

        // Validate required fields for new dashboard
        if (isNewDashboard) {
          if (!title) {
            throw new Error('Title is required when creating a new dashboard.');
          }
          if (!description) {
            throw new Error('Description is required when creating a new dashboard.');
          }

          // Create the dashboard attachment early so we have a stable ID for events
          const initialData: DashboardAttachmentData = {
            title,
            description,
            markdownContent,
            panels: [],
          };

          const newAttachment = await attachments.add({
            type: DASHBOARD_ATTACHMENT_TYPE,
            data: initialData,
            description: `Dashboard: ${title}`,
          });

          currentAttachmentId = newAttachment.id;
          previousData = initialData;
          logger.debug(`Created new dashboard attachment: ${currentAttachmentId}`);
        } else {
          // Get existing dashboard data
          const dashboardAttachment = attachments.get(currentAttachmentId!);
          if (!dashboardAttachment) {
            throw new Error(`Dashboard attachment "${currentAttachmentId}" not found.`);
          }

          if (dashboardAttachment.type !== DASHBOARD_ATTACHMENT_TYPE) {
            throw new Error(`Attachment "${currentAttachmentId}" is not a dashboard attachment.`);
          }

          const latestVersion = attachments.getLatest(currentAttachmentId!);
          if (!latestVersion) {
            throw new Error(
              `Could not retrieve latest version of dashboard attachment "${currentAttachmentId}".`
            );
          }

          previousData = latestVersion.data as DashboardAttachmentData;
        }

        // Build updated metadata
        const updatedTitle = title ?? previousData.title;
        const updatedDescription = description ?? previousData.description;
        const updatedMarkdownContent = markdownContent ?? previousData.markdownContent;

        // Start with existing panels
        let panels: AttachmentPanel[] = [...previousData.panels];

        // Remove panels if specified
        if (removePanelIds && removePanelIds.length > 0) {
          const removeSet = new Set(removePanelIds);
          const removedPanels = panels.filter((panel) => removeSet.has(getPanelId(panel)));

          panels = panels.filter((panel) => !removeSet.has(getPanelId(panel)));

          // Emit panel removed events
          for (const removedPanel of removedPanels) {
            events.sendUiEvent(DASHBOARD_PANEL_REMOVED_EVENT, {
              dashboardAttachmentId: currentAttachmentId,
              panelId: getPanelId(removedPanel),
            });
          }

          logger.debug(`Removed ${removedPanels.length} panels from dashboard`);
        }

        // Add visualization attachments - resolve them inline as lens panels
        if (addVisualizationAttachments && addVisualizationAttachments.length > 0) {
          for (const attachmentId of addVisualizationAttachments) {
            try {
              // Resolve the visualization config from the attachment
              const vizConfig = resolveLensConfigFromAttachment(attachmentId, attachments);

              const panelEntry: LensAttachmentPanel = {
                type: 'lens',
                panelId: uuidv4(),
                visualization: vizConfig,
                title: vizConfig.title,
              };
              panels.push(panelEntry);

              // Emit panel added event with full visualization config
              events.sendUiEvent(DASHBOARD_PANEL_ADDED_EVENT, {
                dashboardAttachmentId: currentAttachmentId,
                panel: {
                  type: 'lens',
                  panelId: panelEntry.panelId,
                  visualization: vizConfig,
                  title: vizConfig.title,
                },
              });
            } catch (error) {
              logger.error(
                `Error resolving visualization attachment "${attachmentId}": ${error.message}`
              );
            }
          }
          logger.debug(
            `Added ${addVisualizationAttachments.length} visualization attachments to dashboard`
          );
        }

        // Create inline visualizations
        if (addVisualizations && addVisualizations.length > 0) {
          for (let i = 0; i < addVisualizations.length; i++) {
            const vizInput = addVisualizations[i];
            const { query: nlQuery, index, chartType, esql } = vizInput;

            events.reportProgress(
              `Creating visualization ${i + 1} of ${addVisualizations.length}: "${nlQuery}"`
            );

            try {
              // Determine chart type if not provided
              let selectedChartType: SupportedChartType = chartType || SupportedChartType.Metric;
              if (!chartType) {
                logger.debug('Chart type not provided, using LLM to suggest one');
                selectedChartType = await guessChartType(modelProvider, '', nlQuery);
              }

              // Get schema for chart type
              const schema = getSchemaForChartType(selectedChartType);

              // Generate visualization configuration
              const model = await modelProvider.getDefaultModel();
              const graph = createVisualizationGraph(model, logger, events, esClient);

              const finalState = await graph.invoke({
                nlQuery,
                index,
                chartType: selectedChartType,
                schema,
                existingConfig: undefined,
                parsedExistingConfig: null,
                esqlQuery: esql || '',
                currentAttempt: 0,
                actions: [],
                validatedConfig: null,
                error: null,
              });

              const { validatedConfig, error, currentAttempt, esqlQuery } = finalState;

              if (!validatedConfig) {
                throw new Error(
                  `Failed to generate valid configuration after ${currentAttempt} attempts. Last error: ${
                    error || 'Unknown error'
                  }`
                );
              }

              // Create lens panel entry
              const panelEntry: LensAttachmentPanel = {
                type: 'lens',
                panelId: uuidv4(),
                visualization: validatedConfig,
                title: validatedConfig.title ?? nlQuery.slice(0, 50),
                query: nlQuery,
                esql: esqlQuery,
              };

              panels.push(panelEntry);

              // Emit panel added event with full visualization config
              events.sendUiEvent(DASHBOARD_PANEL_ADDED_EVENT, {
                dashboardAttachmentId: currentAttachmentId,
                panel: {
                  type: 'lens',
                  panelId: panelEntry.panelId,
                  visualization: validatedConfig,
                  title: panelEntry.title,
                },
              });

              logger.debug(`Created lens visualization: ${panelEntry.panelId}`);
            } catch (vizError) {
              logger.error(
                `Error creating visualization for query "${nlQuery}": ${vizError.message}`
              );
              // Continue with other visualizations even if one fails
            }
          }
        }

        // Build the dashboard panels for the URL
        const markdownPanel = updatedMarkdownContent
          ? buildMarkdownPanel(updatedMarkdownContent)
          : undefined;
        const yOffset = updatedMarkdownContent ? getMarkdownPanelHeight(updatedMarkdownContent) : 0;

        const dashboardPanels = [
          ...(markdownPanel ? [markdownPanel] : []),
          ...normalizePanels(panels, yOffset),
        ];

        const spaceId = spaces?.spacesService?.getSpaceId(request);

        // Generate dashboard URL with attachmentId for agent context persistence
        const dashboardUrl = await dashboardLocator.getRedirectUrl(
          {
            panels: dashboardPanels,
            title: updatedTitle,
            description: updatedDescription,
            viewMode: 'edit',
            time_range: { from: 'now-15m', to: 'now' },
            dashboardAttachmentId: currentAttachmentId,
          },
          { spaceId }
        );

        logger.info(
          `Dashboard ${isNewDashboard ? 'created' : 'updated'} with ${panels.length} panels`
        );

        // Update the dashboard attachment
        const updatedDashboardData: DashboardAttachmentData = {
          title: updatedTitle,
          description: updatedDescription,
          markdownContent: updatedMarkdownContent,
          panels,
        };

        const updatedAttachment = await attachments.update(currentAttachmentId!, {
          data: updatedDashboardData,
          description: `Dashboard: ${updatedTitle}`,
        });

        return {
          results: [
            {
              type: ToolResultType.dashboard,
              tool_result_id: getToolResultId(),
              data: {
                dashboardAttachmentId: currentAttachmentId,
                version: updatedAttachment?.current_version ?? 1,
                url: dashboardUrl,
                title: updatedTitle,
                description: updatedDescription,
                markdownContent: updatedMarkdownContent,
                panelCount: dashboardPanels.length,
                panels: panels.map((panel) => ({
                  type: panel.type,
                  panelId: getPanelId(panel),
                  title: panel.title,
                })),
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
